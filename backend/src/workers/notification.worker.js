'use strict';
const { Worker } = require('bullmq');
const fcmService = require('../services/fcm.service');

const CONNECTION = {
  host: (() => { try { return new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname; } catch { return 'localhost'; } })(),
  port: (() => { try { return parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'); } catch { return 6379; } })(),
};

let worker = null;

function start() {
  if (!process.env.FCM_SERVER_KEY) {
    console.log('[NotifWorker] FCM not configured, worker disabled');
    return;
  }

  worker = new Worker('push-notifications', async (job) => {
    const { type, cameraId, title, body, eventId } = job.data;
    const data = { type, event_id: eventId || '', camera_id: cameraId || '' };

    if (cameraId) {
      await fcmService.sendToCamera(cameraId, title, body, data);
    } else {
      await fcmService.sendToAll(title, body, data);
    }
  }, {
    connection: CONNECTION,
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    console.error(`[NotifWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[NotifWorker] Started');
}

function stop() {
  return worker?.close();
}

module.exports = { start, stop };
