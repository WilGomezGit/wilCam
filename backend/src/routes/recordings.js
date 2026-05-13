'use strict';
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const db = require('../db/database');
const ffmpegService = require('../services/ffmpeg.service');
const socketService = require('../services/socket.service');

// GET /api/recordings
router.get('/', verifyToken, [
  query('camera_id').optional().isUUID(),
  query('date').optional().isDate(),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  validate,
], (req, res, next) => {
  try {
    const { camera_id, date, limit = 50, offset = 0 } = req.query;
    let sql = `SELECT r.*, c.name as camera_name, c.location
               FROM recordings r LEFT JOIN cameras c ON r.camera_id = c.id WHERE 1=1`;
    const params = [];
    if (camera_id) { sql += ' AND r.camera_id = ?'; params.push(camera_id); }
    if (date) { sql += ' AND date(r.start_time) = ?'; params.push(date); }
    sql += ' ORDER BY r.start_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const recordings = db.prepare(sql).all(...params);
    const total = db.prepare(
      `SELECT COUNT(*) as c FROM recordings r WHERE 1=1` +
      (camera_id ? ' AND camera_id = ?' : '') +
      (date ? ' AND date(start_time) = ?' : '')
    ).get(...params.slice(0, -2)).c;
    res.json({ recordings, total, limit, offset });
  } catch (err) { next(err); }
});

// GET /api/recordings/:id
router.get('/:id', verifyToken, (req, res, next) => {
  try {
    const rec = db.prepare('SELECT r.*, c.name as camera_name FROM recordings r LEFT JOIN cameras c ON r.camera_id = c.id WHERE r.id = ?').get(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Grabación no encontrada' });
    res.json(rec);
  } catch (err) { next(err); }
});

// POST /api/recordings/:cameraId/start
router.post('/:cameraId/start', verifyToken, async (req, res, next) => {
  try {
    const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.cameraId);
    if (!cam) return res.status(404).json({ error: 'Cámara no encontrada' });
    if (ffmpegService.isRecording(cam.id)) {
      return res.json({ message: 'Grabación ya activa' });
    }
    const id = uuidv4();
    const startTime = new Date().toISOString();
    const filename = `${cam.id}_${startTime.replace(/[:.]/g, '-')}.mp4`;
    const filepath = `recordings/${filename}`;
    db.prepare('INSERT INTO recordings (id, camera_id, filename, filepath, start_time) VALUES (?, ?, ?, ?, ?)')
      .run(id, cam.id, filename, filepath, startTime);
    await ffmpegService.startRecording(cam, filepath);
    socketService.emitRecordingUpdate(cam.id, { recording: true, recordingId: id });
    res.json({ message: 'Grabación iniciada', recordingId: id });
  } catch (err) { next(err); }
});

// POST /api/recordings/:cameraId/stop
router.post('/:cameraId/stop', verifyToken, async (req, res, next) => {
  try {
    const cam = db.prepare('SELECT id FROM cameras WHERE id = ?').get(req.params.cameraId);
    if (!cam) return res.status(404).json({ error: 'Cámara no encontrada' });
    await ffmpegService.stopRecording(req.params.cameraId);
    const endTime = new Date().toISOString();
    const rec = db.prepare(`SELECT * FROM recordings WHERE camera_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1`).get(req.params.cameraId);
    if (rec) {
      const durationSec = Math.round((new Date(endTime) - new Date(rec.start_time)) / 1000);
      db.prepare('UPDATE recordings SET end_time = ?, duration_seconds = ? WHERE id = ?').run(endTime, durationSec, rec.id);
    }
    socketService.emitRecordingUpdate(req.params.cameraId, { recording: false });
    res.json({ message: 'Grabación detenida' });
  } catch (err) { next(err); }
});

// DELETE /api/recordings/:id
router.delete('/:id', verifyToken, (req, res, next) => {
  try {
    const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Grabación no encontrada' });
    db.prepare('DELETE FROM recordings WHERE id = ?').run(req.params.id);
    res.json({ message: 'Grabación eliminada' });
  } catch (err) { next(err); }
});

module.exports = router;
