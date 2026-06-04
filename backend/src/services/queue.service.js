'use strict';
const { Queue, Worker, QueueEvents } = require('bullmq');
const redisService = require('./redis.service');

const CONNECTION = {
  host: (() => {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    try { return new URL(url).hostname; } catch { return 'localhost'; }
  })(),
  port: (() => {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    try { return parseInt(new URL(url).port || '6379'); } catch { return 6379; }
  })(),
};

// ── Queue definitions ─────────────────────────────────────────────────────
let s3UploadQueue = null;
let aiInferenceQueue = null;
let notificationQueue = null;
let smartRecordingQueue = null;

function getS3Queue() {
  if (!s3UploadQueue) {
    s3UploadQueue = new Queue('s3-upload', {
      connection: CONNECTION,
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100 },
    });
  }
  return s3UploadQueue;
}

function getAIQueue() {
  if (!aiInferenceQueue) {
    aiInferenceQueue = new Queue('ai-inference', {
      connection: CONNECTION,
      defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 1000 }, removeOnComplete: 50 },
    });
  }
  return aiInferenceQueue;
}

function getNotificationQueue() {
  if (!notificationQueue) {
    notificationQueue = new Queue('push-notifications', {
      connection: CONNECTION,
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 50 },
    });
  }
  return notificationQueue;
}

function getSmartRecordingQueue() {
  if (!smartRecordingQueue) {
    smartRecordingQueue = new Queue('smart-recording', {
      connection: CONNECTION,
      defaultJobOptions: { attempts: 1, removeOnComplete: 20 },
    });
  }
  return smartRecordingQueue;
}

async function enqueueS3Upload(recordingId, cameraId, filePath, fileSize) {
  try {
    const q = getS3Queue();
    return await q.add('upload', { recordingId, cameraId, filePath, fileSize }, { jobId: `s3-${recordingId}` });
  } catch (e) {
    console.warn('[Queue] S3 enqueue failed:', e.message);
  }
}

async function enqueueAIInference(cameraId, snapshotUrl, frameId) {
  try {
    const q = getAIQueue();
    return await q.add('infer', { cameraId, snapshotUrl, frameId }, { priority: 1 });
  } catch (e) {
    console.warn('[Queue] AI enqueue failed:', e.message);
  }
}

async function enqueueNotification(payload) {
  try {
    const q = getNotificationQueue();
    return await q.add('push', payload);
  } catch (e) {
    console.warn('[Queue] Notification enqueue failed:', e.message);
  }
}

async function enqueueSmartRecording(cameraId, eventId, preBufferSecs, postBufferSecs) {
  try {
    const q = getSmartRecordingQueue();
    return await q.add('clip', { cameraId, eventId, preBufferSecs, postBufferSecs });
  } catch (e) {
    console.warn('[Queue] SmartRecording enqueue failed:', e.message);
  }
}

module.exports = {
  getS3Queue,
  getAIQueue,
  getNotificationQueue,
  getSmartRecordingQueue,
  enqueueS3Upload,
  enqueueAIInference,
  enqueueNotification,
  enqueueSmartRecording,
};
