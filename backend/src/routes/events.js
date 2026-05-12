const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const socketSvc = require('../services/socket.service');

// GET /api/events?cameraId=&type=&date=&limit=&offset=
router.get('/', (req, res) => {
  const db = getDb();
  const { cameraId, type, date, reviewed, limit = 50, offset = 0 } = req.query;
  let query = `SELECT e.*, c.name as camera_name, c.location
               FROM events e JOIN cameras c ON e.camera_id = c.id WHERE 1=1`;
  const params = [];

  if (cameraId) { query += ' AND e.camera_id = ?'; params.push(cameraId); }
  if (type) { query += ' AND e.event_type = ?'; params.push(type); }
  if (date) { query += ' AND DATE(e.created_at) = ?'; params.push(date); }
  if (reviewed !== undefined) { query += ' AND e.reviewed = ?'; params.push(reviewed === 'true' ? 1 : 0); }

  query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const rows = db.prepare(query).all(...params);
  res.json(rows.map(r => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null })));
});

// GET /api/events/stats
router.get('/stats', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const stats = {
    today: db.prepare("SELECT COUNT(*) as c FROM events WHERE DATE(created_at) = ?").get(today).c,
    unreviewed: db.prepare("SELECT COUNT(*) as c FROM events WHERE reviewed = 0").get().c,
    byType: db.prepare("SELECT event_type, COUNT(*) as count FROM events WHERE DATE(created_at) = ? GROUP BY event_type").all(today),
  };
  res.json(stats);
});

// POST /api/events (internal — from motion detection)
router.post('/', (req, res) => {
  const db = getDb();
  const { camera_id, event_type, confidence, snapshot_path, clip_path, metadata } = req.body;
  if (!camera_id || !event_type) return res.status(400).json({ error: 'camera_id and event_type required' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO events (id, camera_id, event_type, confidence, snapshot_path, clip_path, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, camera_id, event_type, confidence || null, snapshot_path || null, clip_path || null,
         metadata ? JSON.stringify(metadata) : null);

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  socketSvc.emitEvent(event);
  res.status(201).json(event);
});

// PATCH /api/events/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const { reviewed, false_positive } = req.body;
  const updates = {};
  if (reviewed !== undefined) updates.reviewed = reviewed ? 1 : 0;
  if (false_positive !== undefined) updates.false_positive = false_positive ? 1 : 0;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE events SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  res.json(db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id));
});

// DELETE /api/events/:id
router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
