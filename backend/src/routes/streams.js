const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const ffmpegSvc = require('../services/ffmpeg.service');
const socketSvc = require('../services/socket.service');

// POST /api/streams/:cameraId/start
router.post('/:cameraId/start', (req, res) => {
  const db = getDb();
  const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.cameraId);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });

  try {
    ffmpegSvc.startHlsStream(cam.id, cam.rtsp_url);
    const hlsUrl = ffmpegSvc.getM3u8Url(cam.id);
    socketSvc.emitStreamStatus(cam.id, true, hlsUrl);
    res.json({ streaming: true, hlsUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/streams/:cameraId/stop
router.post('/:cameraId/stop', (req, res) => {
  ffmpegSvc.stopHlsStream(req.params.cameraId);
  socketSvc.emitStreamStatus(req.params.cameraId, false, null);
  res.json({ streaming: false });
});

// GET /api/streams/:cameraId/status
router.get('/:cameraId/status', (req, res) => {
  const streaming = ffmpegSvc.isStreaming(req.params.cameraId);
  res.json({
    cameraId: req.params.cameraId,
    streaming,
    hlsUrl: streaming ? ffmpegSvc.getM3u8Url(req.params.cameraId) : null,
  });
});

// POST /api/streams/:cameraId/snapshot
router.post('/:cameraId/snapshot', async (req, res) => {
  const db = getDb();
  const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.cameraId);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });

  try {
    const snap = await ffmpegSvc.captureSnapshot(cam.id, cam.rtsp_url);
    res.json(snap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/streams — all active
router.get('/', (req, res) => {
  res.json(ffmpegSvc.getActiveStreams());
});

module.exports = router;
