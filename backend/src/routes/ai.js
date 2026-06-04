'use strict';
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const aiService = require('../services/ai.service');
const { enqueueAIInference } = require('../services/queue.service');
const db = require('../db/database');

const upload = multer({
  dest: '/tmp/wilcam-ai/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ['.jpg', '.jpeg', '.png'].includes(ext));
  },
});

// GET /api/ai/status — AI service health check
router.get('/status', verifyToken, async (req, res, next) => {
  try {
    const health = await aiService.checkAIServiceHealth();
    res.json({
      configured: !!process.env.AI_SERVICE_URL,
      enabled: process.env.ENABLE_AI !== 'false',
      service: health,
    });
  } catch (e) { next(e); }
});

// POST /api/ai/analyze/:cameraId — Trigger immediate AI analysis on last snapshot
router.post('/analyze/:cameraId', verifyToken, async (req, res, next) => {
  try {
    const { cameraId } = req.params;
    const camera = db.prepare('SELECT * FROM cameras WHERE id=?').get(cameraId);
    if (!camera) return res.status(404).json({ error: 'Cámara no encontrada' });

    const snapshotDir = process.env.SNAPSHOTS_DIR || './public/snapshots';
    const fs = require('fs');
    const files = fs.readdirSync(path.join(snapshotDir))
      .filter(f => f.startsWith(cameraId))
      .sort()
      .reverse();

    if (!files.length) return res.status(404).json({ error: 'No snapshot disponible' });

    const snapshotPath = path.join(snapshotDir, files[0]);
    const result = await aiService.analyzeSnapshot(cameraId, snapshotPath);

    if (result) {
      await aiService.processDetectionResult(cameraId, result);
    }

    res.json({ success: true, result });
  } catch (e) { next(e); }
});

// POST /api/ai/analyze/upload — Upload image for ad-hoc analysis
router.post('/analyze/upload', verifyToken, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    const cameraId = req.body.camera_id || 'manual';
    const result = await aiService.analyzeSnapshot(cameraId, req.file.path);
    res.json({ success: true, result });
  } catch (e) { next(e); }
});

// GET /api/ai/stats — Detection statistics
router.get('/stats', verifyToken, (req, res, next) => {
  try {
    const { period = '24h' } = req.query;
    const hours = period === '7d' ? 168 : period === '30d' ? 720 : 24;

    const stats = db.prepare(`
      SELECT
        event_type,
        COUNT(*) as count,
        AVG(confidence) as avg_confidence,
        MAX(confidence) as max_confidence
      FROM events
      WHERE created_at >= datetime('now', '-${hours} hours')
        AND event_type IN ('person_detected', 'object_detected')
      GROUP BY event_type
      ORDER BY count DESC
    `).all();

    const hourly = db.prepare(`
      SELECT
        strftime('%H', created_at) as hour,
        COUNT(*) as count
      FROM events
      WHERE created_at >= datetime('now', '-24 hours')
        AND event_type IN ('person_detected', 'object_detected')
      GROUP BY hour
      ORDER BY hour
    `).all();

    const perCamera = db.prepare(`
      SELECT
        e.camera_id,
        c.name,
        COUNT(*) as detections
      FROM events e
      JOIN cameras c ON c.id = e.camera_id
      WHERE e.created_at >= datetime('now', '-${hours} hours')
        AND e.event_type IN ('person_detected', 'object_detected')
      GROUP BY e.camera_id
      ORDER BY detections DESC
      LIMIT 10
    `).all();

    res.json({ stats, hourly, perCamera });
  } catch (e) { next(e); }
});

module.exports = router;
