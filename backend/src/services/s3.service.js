'use strict';
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');

const PART_SIZE = 10 * 1024 * 1024; // 10 MB

let _client = null;

function getClient() {
  if (!_client) {
    _client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: process.env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      } : undefined,
    });
  }
  return _client;
}

const BUCKET = () => process.env.AWS_S3_BUCKET || 'wilcam-recordings';
const CF_URL = () => process.env.AWS_CLOUDFRONT_URL || '';

function s3KeyForRecording(cameraId, filename) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `recordings/${cameraId}/${year}/${month}/${day}/${filename}`;
}

function s3KeyForSnapshot(cameraId, filename) {
  const now = new Date();
  return `snapshots/${cameraId}/${now.getFullYear()}/${filename}`;
}

async function uploadRecording(recordingId, cameraId, filePath) {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_S3_BUCKET) {
    return null; // S3 not configured
  }

  const filename = path.basename(filePath);
  const key = s3KeyForRecording(cameraId, filename);
  const fileSize = fs.statSync(filePath).size;

  // Update upload status to 'uploading'
  db.prepare(`UPDATE cloud_uploads SET status='uploading', updated_at=datetime('now') WHERE recording_id=?`).run(recordingId);

  try {
    let cloudUrl;
    if (fileSize > PART_SIZE * 2) {
      cloudUrl = await _multipartUpload(filePath, key, fileSize);
    } else {
      cloudUrl = await _singleUpload(filePath, key);
    }

    // Update DB
    db.prepare(`
      UPDATE recordings SET cloud_uploaded=1, cloud_url=? WHERE id=?
    `).run(cloudUrl, recordingId);
    db.prepare(`
      UPDATE cloud_uploads SET status='done', cloud_path=?, file_size=?, updated_at=datetime('now') WHERE recording_id=?
    `).run(key, fileSize, recordingId);

    console.log(`[S3] Uploaded ${filename} → ${key}`);
    return cloudUrl;
  } catch (err) {
    db.prepare(`
      UPDATE cloud_uploads SET status='failed', error_msg=?, retry_count=retry_count+1, updated_at=datetime('now') WHERE recording_id=?
    `).run(err.message, recordingId);
    throw err;
  }
}

async function _singleUpload(filePath, key) {
  const client = getClient();
  const fileStream = fs.createReadStream(filePath);
  await client.send(new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    Body: fileStream,
    ContentType: 'video/mp4',
    ServerSideEncryption: 'AES256',
  }));
  return _buildUrl(key);
}

async function _multipartUpload(filePath, key, fileSize) {
  const client = getClient();
  const { UploadId } = await client.send(new CreateMultipartUploadCommand({
    Bucket: BUCKET(),
    Key: key,
    ContentType: 'video/mp4',
    ServerSideEncryption: 'AES256',
  }));

  const parts = [];
  const fd = fs.openSync(filePath, 'r');

  try {
    let partNumber = 1;
    let offset = 0;
    while (offset < fileSize) {
      const length = Math.min(PART_SIZE, fileSize - offset);
      const buf = Buffer.alloc(length);
      fs.readSync(fd, buf, 0, length, offset);

      const { ETag } = await client.send(new UploadPartCommand({
        Bucket: BUCKET(),
        Key: key,
        UploadId,
        PartNumber: partNumber,
        Body: buf,
      }));
      parts.push({ PartNumber: partNumber, ETag });
      offset += length;
      partNumber++;
    }

    await client.send(new CompleteMultipartUploadCommand({
      Bucket: BUCKET(),
      Key: key,
      UploadId,
      MultipartUpload: { Parts: parts },
    }));
    return _buildUrl(key);
  } catch (err) {
    await client.send(new AbortMultipartUploadCommand({ Bucket: BUCKET(), Key: key, UploadId }));
    throw err;
  } finally {
    fs.closeSync(fd);
  }
}

async function getSignedDownloadUrl(key, expiresIn = 3600) {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: BUCKET(), Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

async function deleteObject(key) {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}

function _buildUrl(key) {
  const cf = CF_URL();
  if (cf) return `${cf}/${key}`;
  return `https://${BUCKET()}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

module.exports = { uploadRecording, getSignedDownloadUrl, deleteObject, s3KeyForSnapshot };
