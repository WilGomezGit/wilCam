'use strict';
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const db = require('../db/database');
const ffmpegService = require('../services/ffmpeg.service');

// GET /api/streams — all active
router.get('/', verifyToken, (req, res) => {
  const active = ffmpegService.getActiveStreams();
  res.json(active);
});

// GET /api/streams/:cameraId/status
router.get('/:cameraId/status', verifyToken, (req, res, next) => {
  try {
    const cam = db.prepare('SELECT id, name FROM cameras WHERE id = ?').get(req.params.cameraId);
    if (!cam) return res.status(404).json({ error: 'Cámara no encontrada' });
    res.json({
      cameraId: req.params.cameraId,
      streaming: ffmpegService.isStreaming(req.params.cameraId),
      recording: ffmpegService.isRecording(req.params.cameraId),
      hlsUrl: ffmpegService.isStreaming(req.params.cameraId) ? `/hls/${req.params.cameraId}/index.m3u8` : null,
    });
  } catch (err) { next(err); }
});

// POST /api/streams/:cameraId/start
router.post('/:cameraId/start', verifyToken, async (req, res, next) => {
  try {
    const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.cameraId);
    if (!cam) return res.status(404).json({ error: 'Cámara no encontrada' });
    if (ffmpegService.isStreaming(cam.id)) {
      return res.json({ message: 'Stream ya activo', hlsUrl: `/hls/${cam.id}/index.m3u8` });
    }
    await ffmpegService.startHlsStream(cam);
    res.json({ message: 'Stream iniciado', hlsUrl: `/hls/${cam.id}/index.m3u8` });
  } catch (err) { next(err); }
});

// POST /api/streams/:cameraId/stop
router.post('/:cameraId/stop', verifyToken, async (req, res, next) => {
  try {
    const cam = db.prepare('SELECT id FROM cameras WHERE id = ?').get(req.params.cameraId);
    if (!cam) return res.status(404).json({ error: 'Cámara no encontrada' });
    await ffmpegService.stopHlsStream(req.params.cameraId);
    res.json({ message: 'Stream detenido' });
  } catch (err) { next(err); }
});

// POST /api/streams/:cameraId/snapshot
router.post('/:cameraId/snapshot', verifyToken, async (req, res, next) => {
  try {
    const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.cameraId);
    if (!cam) return res.status(404).json({ error: 'Cámara no encontrada' });
    const snapshotPath = await ffmpegService.captureSnapshot(cam);
    res.json({ snapshotPath, url: `/${snapshotPath}` });
  } catch (err) { next(err); }
});

module.exports = router;
