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
const fs = require('fs');
const path = require('path');

const REC_DIR = path.resolve(process.env.RECORDINGS_DIR || './public/recordings');

// Parse recording filename: rec_YYYYMMDD_HHMMSS.mp4
function parseRecFilename(filename) {
  const m = filename.match(/^rec_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.mp4$/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
}

// ── GET /api/recordings/files/:cameraId?date=YYYY-MM-DD ──────────────────────
// Lists actual recording files on disk for a camera, optionally filtered by date
router.get('/files/:cameraId', verifyToken, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    const cam = db.prepare('SELECT id FROM cameras WHERE id = ?').get(cameraId);
    if (!cam) return res.status(404).json({ error: 'Cámara no encontrada' });

    const dir = path.join(REC_DIR, cameraId);
    let files = [];

    if (fs.existsSync(dir)) {
      const dateFilter = date ? date.replace(/-/g, '') : null; // YYYYMMDD

      const allFiles = fs.readdirSync(dir)
        .filter(f => f.startsWith('rec_') && f.endsWith('.mp4'))
        .sort();

      for (const filename of allFiles) {
        const startTime = parseRecFilename(filename);
        if (!startTime) continue;
        const fileDate = filename.substring(4, 12); // YYYYMMDD from rec_YYYYMMDD
        if (dateFilter && fileDate !== dateFilter) continue;

        const filePath = path.join(dir, filename);
        try {
          const stat = fs.statSync(filePath);
          files.push({
            filename,
            url: `/recordings/${cameraId}/${filename}`,
            startTime: startTime.toISOString(),
            sizeBytes: stat.size,
            date: fileDate,
          });
        } catch (_) {
          // skip unreadable file
        }
      }
    }

    res.json({ files, cameraId, date: date || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/recordings/dates/:cameraId?year=2026&month=5 ────────────────────
// Returns array of date strings (YYYY-MM-DD) that have recordings for a camera+month
router.get('/dates/:cameraId', verifyToken, (req, res) => {
  try {
    const { cameraId } = req.params;
    const year  = parseInt(req.query.year  || new Date().getFullYear());
    const month = parseInt(req.query.month || new Date().getMonth() + 1);

    const cam = db.prepare('SELECT id FROM cameras WHERE id = ?').get(cameraId);
    if (!cam) return res.status(404).json({ error: 'Cámara no encontrada' });

    const dir = path.join(REC_DIR, cameraId);
    const dates = new Set();

    if (fs.existsSync(dir)) {
      const prefix = `rec_${year}${String(month).padStart(2, '0')}`;
      fs.readdirSync(dir)
        .filter(f => f.startsWith(prefix) && f.endsWith('.mp4'))
        .forEach(f => {
          const d = f.substring(4, 12); // YYYYMMDD
          dates.add(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`);
        });
    }

    res.json({ dates: [...dates].sort(), cameraId, year, month });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/recordings ──────────────────────────────────────────────────────
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
    if (date)      { sql += ' AND date(r.start_time) = ?'; params.push(date); }
    sql += ' ORDER BY r.start_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const recordings = db.prepare(sql).all(...params);
    const countSql = `SELECT COUNT(*) as c FROM recordings WHERE 1=1` +
      (camera_id ? ' AND camera_id = ?' : '') +
      (date ? ' AND date(start_time) = ?' : '');
    const total = db.prepare(countSql).get(...params.slice(0, -2)).c;
    res.json({ recordings, total, limit, offset });
  } catch (err) { next(err); }
});

// ── GET /api/recordings/:id ──────────────────────────────────────────────────
router.get('/:id', verifyToken, (req, res, next) => {
  try {
    const rec = db.prepare('SELECT r.*, c.name as camera_name FROM recordings r LEFT JOIN cameras c ON r.camera_id = c.id WHERE r.id = ?').get(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Grabación no encontrada' });
    res.json(rec);
  } catch (err) { next(err); }
});

// ── POST /api/recordings/:cameraId/start ─────────────────────────────────────
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

// ── POST /api/recordings/:cameraId/stop ──────────────────────────────────────
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

// ── DELETE /api/recordings/:id ───────────────────────────────────────────────
router.delete('/:id', verifyToken, (req, res, next) => {
  try {
    const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Grabación no encontrada' });
    db.prepare('DELETE FROM recordings WHERE id = ?').run(req.params.id);
    res.json({ message: 'Grabación eliminada' });
  } catch (err) { next(err); }
});

module.exports = router;
