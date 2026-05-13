'use strict';
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, query, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const db = require('../db/database');
const socketService = require('../services/socket.service');

// GET /api/events
router.get('/', verifyToken, [
  query('camera_id').optional().isUUID(),
  query('type').optional().isString(),
  query('date').optional().isDate(),
  query('reviewed').optional().isBoolean().toBoolean(),
  query('false_positive').optional().isBoolean().toBoolean(),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  validate,
], (req, res, next) => {
  try {
    const { camera_id, type, date, reviewed, false_positive, limit = 50, offset = 0 } = req.query;
    let sql = `SELECT e.*, c.name as camera_name, c.location
               FROM events e LEFT JOIN cameras c ON e.camera_id = c.id WHERE 1=1`;
    const params = [];
    if (camera_id) { sql += ' AND e.camera_id = ?'; params.push(camera_id); }
    if (type) { sql += ' AND e.event_type = ?'; params.push(type); }
    if (date) { sql += ' AND date(e.created_at) = ?'; params.push(date); }
    if (reviewed !== undefined) { sql += ' AND e.reviewed = ?'; params.push(reviewed ? 1 : 0); }
    if (false_positive !== undefined) { sql += ' AND e.false_positive = ?'; params.push(false_positive ? 1 : 0); }
    sql += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const events = db.prepare(sql).all(...params);
    const countParams = params.slice(0, -2);
    const total = db.prepare(
      `SELECT COUNT(*) as c FROM events e WHERE 1=1` +
      (camera_id ? ' AND e.camera_id = ?' : '') +
      (type ? ' AND e.event_type = ?' : '') +
      (date ? ' AND date(e.created_at) = ?' : '') +
      (reviewed !== undefined ? ' AND e.reviewed = ?' : '') +
      (false_positive !== undefined ? ' AND e.false_positive = ?' : '')
    ).get(...countParams).c;
    res.json({ events, total, limit, offset });
  } catch (err) { next(err); }
});

// GET /api/events/stats
router.get('/stats', verifyToken, (req, res, next) => {
  try {
    const today = db.prepare(`SELECT COUNT(*) as c FROM events WHERE date(created_at) = date('now')`).get().c;
    const unreviewed = db.prepare(`SELECT COUNT(*) as c FROM events WHERE reviewed = 0 AND false_positive = 0`).get().c;
    const byType = db.prepare(`
      SELECT event_type as type, COUNT(*) as count
      FROM events WHERE date(created_at) = date('now')
      GROUP BY event_type ORDER BY count DESC
    `).all();
    const last7days = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM events WHERE created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at) ORDER BY date
    `).all();
    res.json({ today, unreviewed, byType, last7days });
  } catch (err) { next(err); }
});

// GET /api/events/:id
router.get('/:id', verifyToken, (req, res, next) => {
  try {
    const event = db.prepare('SELECT e.*, c.name as camera_name, c.location FROM events e LEFT JOIN cameras c ON e.camera_id = c.id WHERE e.id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(event);
  } catch (err) { next(err); }
});

// POST /api/events (internal - from AI/motion system)
router.post('/', verifyToken, [
  body('camera_id').isUUID().withMessage('camera_id inválido'),
  body('event_type').trim().isLength({ min: 2 }).withMessage('event_type requerido'),
  body('confidence').optional().isFloat({ min: 0, max: 100 }),
  validate,
], (req, res, next) => {
  try {
    const { camera_id, event_type, confidence, snapshot_path, clip_path, metadata } = req.body;
    const cam = db.prepare('SELECT id FROM cameras WHERE id = ?').get(camera_id);
    if (!cam) return res.status(404).json({ error: 'Cámara no encontrada' });
    const id = uuidv4();
    db.prepare(`
      INSERT INTO events (id, camera_id, event_type, confidence, snapshot_path, clip_path, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, camera_id, event_type, confidence || null, snapshot_path || null, clip_path || null,
        JSON.stringify(metadata || {}));
    const event = db.prepare('SELECT e.*, c.name as camera_name FROM events e LEFT JOIN cameras c ON e.camera_id = c.id WHERE e.id = ?').get(id);
    socketService.emitEvent(event);
    res.status(201).json(event);
  } catch (err) { next(err); }
});

// PATCH /api/events/:id
router.patch('/:id', verifyToken, [
  body('reviewed').optional().isBoolean(),
  body('false_positive').optional().isBoolean(),
  validate,
], (req, res, next) => {
  try {
    const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
    const updates = {};
    if (req.body.reviewed !== undefined) updates.reviewed = req.body.reviewed ? 1 : 0;
    if (req.body.false_positive !== undefined) updates.false_positive = req.body.false_positive ? 1 : 0;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Sin campos para actualizar' });
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE events SET ${setClause} WHERE id = ?`).run(...Object.values(updates), req.params.id);
    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE /api/events/:id
router.delete('/:id', verifyToken, (req, res, next) => {
  try {
    const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ message: 'Evento eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
