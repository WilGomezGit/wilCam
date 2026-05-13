'use strict';
const redisService = require('../services/redis.service');
const aiService = require('../services/ai.service');

const DETECTION_CHANNEL = 'wilcam:detections';

async function start() {
  try {
    await redisService.subscribe(DETECTION_CHANNEL, async (payload) => {
      if (!payload?.camera_id) return;
      try {
        await aiService.processDetectionResult(payload.camera_id, payload);
      } catch (e) {
        console.error('[AIDetectionWorker] Processing error:', e.message);
      }
    });
    console.log('[AIDetectionWorker] Subscribed to Redis detection channel');
  } catch (e) {
    console.warn('[AIDetectionWorker] Could not subscribe:', e.message);
  }
}

module.exports = { start };
