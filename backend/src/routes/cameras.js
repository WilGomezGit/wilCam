const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const ffmpegSvc = require('../services/ffmpeg.service');
const socketSvc = require('../services/socket.service');

// GET /api/cameras
router.get('/', (req, res) => {
  const db = getDb();
  const cameras = db.prepare('SELECT * FROM cameras ORDER BY name').all();
  const enriched = cameras.map(c => ({
    ...c,
    streaming: ffmpegSvc.isStreaming(c.id),
    recording: ffmpegSvc.isRecording(c.id),
    hlsUrl: ffmpegSvc.getM3u8Url(c.id),
  }));
  res.json(enriched);
});

// GET /api/cameras/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });
  res.json({
    ...cam,
    streaming: ffmpegSvc.isStreaming(cam.id),
    recording: ffmpegSvc.isRecording(cam.id),
    hlsUrl: ffmpegSvc.getM3u8Url(cam.id),
  });
});

// POST /api/cameras
router.post('/', (req, res) => {
  const db = getDb();
  const { name, location, group_name, rtsp_url, onvif_host, onvif_port, username, password,
          resolution, fps, codec, recording_enabled, ai_enabled, ptz_enabled } = req.body;

  if (!name || !rtsp_url) return res.status(400).json({ error: 'name and rtsp_url are required' });

  const id = uuidv4().slice(0, 8);
  db.prepare(`
    INSERT INTO cameras (id, name, location, group_name, rtsp_url, onvif_host, onvif_port,
      username, password, resolution, fps, codec, recording_enabled, ai_enabled, ptz_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, location || '', group_name || 'default', rtsp_url,
         onvif_host || null, onvif_port || 80, username || null, password || null,
         resolution || '1920x1080', fps || 25, codec || 'H.265',
         recording_enabled !== false ? 1 : 0,
         ai_enabled !== false ? 1 : 0,
         ptz_enabled ? 1 : 0);

  const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(id);
  socketSvc.emitCameraStatus(id, 'added');
  res.status(201).json(cam);
});

// PUT /api/cameras/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });

  const fields = ['name','location','group_name','rtsp_url','onvif_host','onvif_port',
                  'username','password','resolution','fps','codec',
                  'recording_enabled','ai_enabled','ptz_enabled'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  updates.updated_at = new Date().toISOString();

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE cameras SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), req.params.id);

  res.json(db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id));
});

// DELETE /api/cameras/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });

  ffmpegSvc.stopHlsStream(req.params.id);
  ffmpegSvc.stopRecording(req.params.id);
  db.prepare('DELETE FROM cameras WHERE id = ?').run(req.params.id);
  socketSvc.emitCameraStatus(req.params.id, 'removed');
  res.json({ success: true });
});

module.exports = router;
