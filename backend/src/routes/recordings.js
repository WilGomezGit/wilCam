const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const ffmpegSvc = require('../services/ffmpeg.service');
const socketSvc = require('../services/socket.service');
const { v4: uuidv4 } = require('uuid');

// GET /api/recordings?cameraId=&date=&limit=
router.get('/', (req, res) => {
  const db = getDb();
  const { cameraId, date, limit = 50, offset = 0 } = req.query;
  let query = 'SELECT * FROM recordings WHERE 1=1';
  const params = [];

  if (cameraId) { query += ' AND camera_id = ?'; params.push(cameraId); }
  if (date) { query += ' AND DATE(start_time) = ?'; params.push(date); }

  query += ` ORDER BY start_time DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  res.json(db.prepare(query).all(...params));
});

// POST /api/recordings/:cameraId/start
router.post('/:cameraId/start', (req, res) => {
  const db = getDb();
  const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.cameraId);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });

  const id = uuidv4();
  const now = new Date().toISOString();
  const filename = `rec_${req.params.cameraId}_${Date.now()}.mp4`;
  const recPath = `recordings/${req.params.cameraId}/${filename}`;

  db.prepare(`
    INSERT INTO recordings (id, camera_id, filename, path, start_time)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.params.cameraId, filename, recPath, now);

  ffmpegSvc.startRecording(cam.id, cam.rtsp_url);
  socketSvc.emitRecordingUpdate(cam.id, { id, status: 'started' });
  res.json({ id, cameraId: cam.id, status: 'started' });
});

// POST /api/recordings/:cameraId/stop
router.post('/:cameraId/stop', (req, res) => {
  const db = getDb();
  ffmpegSvc.stopRecording(req.params.cameraId);

  const rec = db.prepare(
    'SELECT * FROM recordings WHERE camera_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1'
  ).get(req.params.cameraId);

  if (rec) {
    const now = new Date().toISOString();
    const dur = Math.floor((Date.now() - new Date(rec.start_time).getTime()) / 1000);
    db.prepare('UPDATE recordings SET end_time = ?, duration_seconds = ? WHERE id = ?')
      .run(now, dur, rec.id);
    socketSvc.emitRecordingUpdate(req.params.cameraId, { id: rec.id, status: 'stopped', duration: dur });
  }
  res.json({ cameraId: req.params.cameraId, status: 'stopped' });
});

// DELETE /api/recordings/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Recording not found' });
  db.prepare('DELETE FROM recordings WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
