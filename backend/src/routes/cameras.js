'use strict';
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const db = require('../db/database');
const ffmpegService = require('../services/ffmpeg.service');
const socketService = require('../services/socket.service');

const cameraValidators = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Nombre entre 2 y 60 caracteres'),
  body('rtsp_url').trim().matches(/^rtsp:\/\//).withMessage('URL RTSP inválida (debe comenzar con rtsp://)'),
  body('location').optional().trim().isLength({ max: 100 }),
  body('group_name').optional().trim().isLength({ max: 50 }),
  body('resolution').optional().isIn(['HD', '4K', '2K', '720p', '480p']),
  body('fps').optional().isInt({ min: 1, max: 60 }),
  body('codec').optional().isIn(['h264', 'h265', 'mjpeg']),
  body('onvif_port').optional().isInt({ min: 1, max: 65535 }),
];

// GET /api/cameras
router.get('/', verifyToken, (req, res, next) => {
  try {
    const cameras = db.prepare('SELECT * FROM cameras ORDER BY sort_order, name').all();
    const withStatus = cameras.map(cam => ({
      ...cam,
      streaming: ffmpegService.isStreaming(cam.id),
      recording: ffmpegService.isRecording(cam.id),
      hlsUrl: ffmpegService.isStreaming(cam.id) ? `/hls/${cam.id}/index.m3u8` : null,
      password: undefined, // never send password
    }));
    res.json(withStatus);
  } catch (err) { next(err); }
});

// GET /api/cameras/:id
router.get('/:id', verifyToken, (req, res, next) => {
  try {
    const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id);
    if (!cam) return res.status(404).json({ error: 'Cámara no encontrada' });
    res.json({
      ...cam,
      password: undefined,
      streaming: ffmpegService.isStreaming(cam.id),
      recording: ffmpegService.isRecording(cam.id),
      hlsUrl: ffmpegService.isStreaming(cam.id) ? `/hls/${cam.id}/index.m3u8` : null,
    });
  } catch (err) { next(err); }
});

// POST /api/cameras/test-connection — test RTSP before adding
router.post('/test-connection', verifyToken, [
  body('rtsp_url').trim().matches(/^rtsp:\/\//).withMessage('URL RTSP inválida'),
  validate,
], async (req, res, next) => {
  try {
    const { rtsp_url } = req.body;
    const start = Date.now();
    const reachable = await ffmpegService.testRtspConnection(rtsp_url);
    const latencyMs = Date.now() - start;
    if (reachable) {
      res.json({ success: true, latencyMs, message: `Conexión exitosa · ${latencyMs}ms` });
    } else {
      res.json({ success: false, message: 'No se pudo conectar al stream RTSP' });
    }
  } catch (err) { next(err); }
});

// POST /api/cameras
router.post('/', verifyToken, cameraValidators, validate, (req, res, next) => {
  try {
    const id = uuidv4();
    const {
      name, rtsp_url, location = '', group_name = 'default',
      onvif_host, onvif_port = 80, username = '', password = '',
      resolution = 'HD', fps = 15, codec = 'h264',
      recording_enabled = 1, ai_enabled = 0, ptz_enabled = 0,
    } = req.body;
    db.prepare(`
      INSERT INTO cameras (id, name, rtsp_url, location, group_name, onvif_host, onvif_port,
        username, password, resolution, fps, codec, recording_enabled, ai_enabled, ptz_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, rtsp_url, location, group_name, onvif_host || null, onvif_port,
        username, password, resolution, fps, codec,
        recording_enabled ? 1 : 0, ai_enabled ? 1 : 0, ptz_enabled ? 1 : 0);
    const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(id);
    socketService.emitCameraStatus(id, 'offline');
    res.status(201).json({ ...camera, password: undefined });
  } catch (err) { next(err); }
});

// PUT /api/cameras/:id
router.put('/:id', verifyToken, cameraValidators.map(v => v.optional()), validate, (req, res, next) => {
  try {
    const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id);
    if (!cam) return res.status(404).json({ error: 'Cámara no encontrada' });
    const fields = ['name','rtsp_url','location','group_name','onvif_host','onvif_port',
      'username','password','resolution','fps','codec','recording_enabled','ai_enabled','ptz_enabled','sort_order'];
    const updates = {};
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Sin campos para actualizar' });
    }
    updates.updated_at = new Date().toISOString();
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE cameras SET ${setClause} WHERE id = ?`).run(...Object.values(updates), req.params.id);
    const updated = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id);
    res.json({ ...updated, password: undefined });
  } catch (err) { next(err); }
});

// DELETE /api/cameras/:id
router.delete('/:id', verifyToken, (req, res, next) => {
  try {
    const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id);
    if (!cam) return res.status(404).json({ error: 'Cámara no encontrada' });
    ffmpegService.stopHlsStream(cam.id).catch(() => {});
    ffmpegService.stopRecording(cam.id).catch(() => {});
    db.prepare('DELETE FROM cameras WHERE id = ?').run(req.params.id);
    res.json({ message: 'Cámara eliminada' });
  } catch (err) { next(err); }
});

module.exports = router;
