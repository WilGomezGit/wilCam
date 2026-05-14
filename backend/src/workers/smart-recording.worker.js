'use strict';
const { Worker } = require('bullmq');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const socketService = require('../services/socket.service');

const CONNECTION = {
  host: (() => { try { return new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname; } catch { return 'localhost'; } })(),
  port: (() => { try { return parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'); } catch { return 6379; } })(),
};

const RECORDINGS_DIR = process.env.RECORDINGS_DIR || './public/recordings';

let worker = null;

function start() {
  worker = new Worker('smart-recording', async (job) => {
    const { cameraId, eventId, preBufferSecs, postBufferSecs } = job.data;

    const clipId = uuidv4();
    db.prepare(`
      INSERT INTO smart_clips (id, camera_id, event_id, start_offset_sec, end_offset_sec, status)
      VALUES (?, ?, ?, ?, ?, 'processing')
    `).run(clipId, cameraId, eventId, preBufferSecs, postBufferSecs);

    try {
      // Find the active recording for this camera
      const activeRecording = db.prepare(`
        SELECT * FROM recordings
        WHERE camera_id = ? AND end_time IS NULL
        ORDER BY start_time DESC LIMIT 1
      `).get(cameraId);

      if (!activeRecording) {
        db.prepare(`UPDATE smart_clips SET status='failed', error_msg='No active recording' WHERE id=?`).run(clipId);
        return;
      }

      const clipFilename = `clip_${cameraId}_${Date.now()}.mp4`;
      const clipPath = path.join(RECORDINGS_DIR, clipFilename);

      await _extractClip(activeRecording.filepath, clipPath, preBufferSecs, postBufferSecs);

      const size = fs.existsSync(clipPath) ? fs.statSync(clipPath).size : 0;
      const duration = preBufferSecs + postBufferSecs;

      db.prepare(`
        UPDATE smart_clips
        SET status='done', filepath=?, recording_id=?
        WHERE id=?
      `).run(clipPath, activeRecording.id, clipId);

      socketService.emitEvent({
        type: 'smart_clip_ready',
        camera_id: cameraId,
        event_id: eventId,
        clip_id: clipId,
        clip_path: `/recordings/${clipFilename}`,
      });

      console.log(`[SmartRecWorker] Clip ready: ${clipFilename} (${duration}s)`);
    } catch (err) {
      db.prepare(`UPDATE smart_clips SET status='failed', error_msg=? WHERE id=?`).run(err.message, clipId);
      throw err;
    }
  }, {
    connection: CONNECTION,
    concurrency: 3,
  });

  worker.on('failed', (job, err) => {
    console.error(`[SmartRecWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[SmartRecWorker] Started');
}

async function _extractClip(sourcePath, outputPath, preBufferSecs, postBufferSecs) {
  return new Promise((resolve, reject) => {
    const ffmpeg = require('fluent-ffmpeg');
    if (!fs.existsSync(sourcePath)) return reject(new Error('Source file not found'));

    const duration = preBufferSecs + postBufferSecs;
    const seekBack = `-${preBufferSecs}`;

    ffmpeg(sourcePath)
      .inputOptions(['-sseof', seekBack])
      .duration(duration)
      .outputOptions(['-c copy', '-movflags +faststart'])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

function stop() {
  return worker?.close();
}

module.exports = { start, stop };
