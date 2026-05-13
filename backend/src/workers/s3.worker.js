'use strict';
const { Worker } = require('bullmq');
const s3Service = require('../services/s3.service');
const socketService = require('../services/socket.service');

const CONNECTION = {
  host: (() => { try { return new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname; } catch { return 'localhost'; } })(),
  port: (() => { try { return parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'); } catch { return 6379; } })(),
};

let worker = null;

function start() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_S3_BUCKET) {
    console.log('[S3Worker] S3 not configured, worker disabled');
    return;
  }

  worker = new Worker('s3-upload', async (job) => {
    const { recordingId, cameraId, filePath, fileSize } = job.data;
    console.log(`[S3Worker] Uploading recording ${recordingId} (${Math.round((fileSize || 0) / 1024 / 1024)}MB)`);

    try {
      const cloudUrl = await s3Service.uploadRecording(recordingId, cameraId, filePath);
      socketService.emitRecordingUpdate({ id: recordingId, cloud_uploaded: 1, cloud_url: cloudUrl });
      console.log(`[S3Worker] Done: ${recordingId} → ${cloudUrl}`);
      return { cloudUrl };
    } catch (err) {
      console.error(`[S3Worker] Failed: ${recordingId} —`, err.message);
      throw err;
    }
  }, {
    connection: CONNECTION,
    concurrency: 2,
  });

  worker.on('failed', (job, err) => {
    console.error(`[S3Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
  });

  console.log('[S3Worker] Started');
}

function stop() {
  return worker?.close();
}

module.exports = { start, stop };
