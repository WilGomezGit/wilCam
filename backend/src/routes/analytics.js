'use strict';
const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const db = require('../db/database');

// GET /api/analytics/overview — Dashboard KPI summary
router.get('/overview', verifyToken, (req, res, next) => {
  try {
    const { period = '7d' } = req.query;
    const days = period === '30d' ? 30 : period === '24h' ? 1 : 7;

    const cameras = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='online' THEN 1 ELSE 0 END) as online,
        SUM(CASE WHEN status='offline' THEN 1 ELSE 0 END) as offline,
        SUM(CASE WHEN status='recording' THEN 1 ELSE 0 END) as recording,
        SUM(CASE WHEN ai_enabled=1 THEN 1 ELSE 0 END) as ai_enabled
      FROM cameras
    `).get();

    const events = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN event_type='person_detected' THEN 1 ELSE 0 END) as persons,
        SUM(CASE WHEN event_type='motion' THEN 1 ELSE 0 END) as motion,
        SUM(CASE WHEN false_positive=1 THEN 1 ELSE 0 END) as false_positives,
        SUM(CASE WHEN reviewed=0 THEN 1 ELSE 0 END) as unreviewed
      FROM events
      WHERE created_at >= datetime('now', '-${days} days')
    `).get();

    const recordings = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN end_time IS NULL THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN cloud_uploaded=1 THEN 1 ELSE 0 END) as in_cloud,
        COALESCE(SUM(size_bytes), 0) as total_bytes,
        COALESCE(SUM(duration_seconds), 0) as total_seconds
      FROM recordings
      WHERE start_time >= datetime('now', '-${days} days')
    `).get();

    res.json({ cameras, events, recordings, period });
  } catch (e) { next(e); }
});

// GET /api/analytics/timeseries — Events over time (grouped by hour or day)
router.get('/timeseries', verifyToken, (req, res, next) => {
  try {
    const { period = '7d', camera_id, event_type } = req.query;
    const days = period === '30d' ? 30 : period === '24h' ? 1 : 7;
    const groupBy = days <= 1 ? '%H:00' : '%Y-%m-%d';
    const interval = days <= 1 ? '-24 hours' : `-${days} days`;

    let query = `
      SELECT
        strftime('${groupBy}', created_at) as period,
        COUNT(*) as count,
        AVG(confidence) as avg_confidence
      FROM events
      WHERE created_at >= datetime('now', '${interval}')
    `;
    const params = [];
    if (camera_id) { query += ' AND camera_id = ?'; params.push(camera_id); }
    if (event_type) { query += ' AND event_type = ?'; params.push(event_type); }
    query += ' GROUP BY period ORDER BY period';

    res.json(db.prepare(query).all(...params));
  } catch (e) { next(e); }
});

// GET /api/analytics/cameras/uptime — Camera uptime stats
router.get('/cameras/uptime', verifyToken, (req, res, next) => {
  try {
    const uptime = db.prepare(`
      SELECT
        c.id, c.name, c.location, c.status,
        COUNT(DISTINCT r.id) as recording_count,
        COALESCE(SUM(r.duration_seconds), 0) as recorded_seconds,
        COUNT(DISTINCT e.id) as event_count
      FROM cameras c
      LEFT JOIN recordings r ON r.camera_id = c.id AND r.start_time >= datetime('now', '-7 days')
      LEFT JOIN events e ON e.camera_id = c.id AND e.created_at >= datetime('now', '-7 days')
      GROUP BY c.id
      ORDER BY c.sort_order
    `).all();
    res.json(uptime);
  } catch (e) { next(e); }
});

// GET /api/analytics/heatmap — Hour×DayOfWeek activity heatmap
router.get('/heatmap', verifyToken, (req, res, next) => {
  try {
    const { camera_id } = req.query;
    let query = `
      SELECT
        CAST(strftime('%w', created_at) AS INTEGER) as dow,
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as count
      FROM events
      WHERE created_at >= datetime('now', '-30 days')
    `;
    const params = [];
    if (camera_id) { query += ' AND camera_id = ?'; params.push(camera_id); }
    query += ' GROUP BY dow, hour ORDER BY dow, hour';

    res.json(db.prepare(query).all(...params));
  } catch (e) { next(e); }
});

// GET /api/analytics/ai/accuracy — AI detection accuracy metrics
router.get('/ai/accuracy', verifyToken, (req, res, next) => {
  try {
    const metrics = db.prepare(`
      SELECT
        event_type,
        COUNT(*) as total,
        SUM(CASE WHEN false_positive=1 THEN 1 ELSE 0 END) as false_positives,
        SUM(CASE WHEN reviewed=1 AND false_positive=0 THEN 1 ELSE 0 END) as confirmed,
        AVG(confidence) as avg_confidence,
        MIN(confidence) as min_confidence,
        MAX(confidence) as max_confidence
      FROM events
      WHERE event_type IN ('person_detected', 'object_detected')
        AND created_at >= datetime('now', '-30 days')
      GROUP BY event_type
    `).all();

    const byCamera = db.prepare(`
      SELECT
        e.camera_id, c.name,
        COUNT(*) as detections,
        SUM(CASE WHEN e.false_positive=1 THEN 1 ELSE 0 END) as false_positives,
        AVG(e.confidence) as avg_confidence
      FROM events e
      JOIN cameras c ON c.id = e.camera_id
      WHERE e.event_type IN ('person_detected', 'object_detected')
        AND e.created_at >= datetime('now', '-30 days')
      GROUP BY e.camera_id
      ORDER BY detections DESC
    `).all();

    res.json({ metrics, byCamera });
  } catch (e) { next(e); }
});

// GET /api/analytics/storage — Storage usage breakdown
router.get('/storage', verifyToken, (req, res, next) => {
  try {
    const local = db.prepare(`
      SELECT
        c.name as camera_name,
        COUNT(r.id) as recordings,
        COALESCE(SUM(r.size_bytes), 0) as bytes,
        COALESCE(SUM(r.duration_seconds), 0) as seconds
      FROM cameras c
      LEFT JOIN recordings r ON r.camera_id = c.id
      GROUP BY c.id
      ORDER BY bytes DESC
    `).all();

    const cloud = db.prepare(`
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(file_size), 0) as bytes
      FROM cloud_uploads
      GROUP BY status
    `).all();

    const pending = db.prepare('SELECT COUNT(*) as c FROM cloud_uploads WHERE status=\'pending\'').get();

    res.json({ local, cloud, pending_upload_count: pending.c });
  } catch (e) { next(e); }
});

module.exports = router;
