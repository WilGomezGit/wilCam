'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const { verifyToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { enqueueNotification } = require('../services/queue.service');
const db = require('../db/database');

// POST /api/notifications/register — Register FCM push token
router.post('/register',
  verifyToken,
  body('token').isString().trim().notEmpty().withMessage('Token FCM requerido'),
  body('platform').isIn(['android', 'ios', 'web']).withMessage('Platform inválida'),
  validate,
  (req, res, next) => {
    try {
      const { token, platform } = req.body;
      const userId = req.user.id;
      const { v4: uuidv4 } = require('uuid');

      // Upsert push token
      db.prepare(`
        INSERT INTO push_tokens (id, user_id, token, platform, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id, platform=excluded.platform, updated_at=datetime('now')
      `).run(uuidv4(), userId, token, platform);

      res.json({ success: true });
    } catch (e) { next(e); }
  }
);

// DELETE /api/notifications/unregister — Remove push token
router.delete('/unregister',
  verifyToken,
  body('token').isString().trim().notEmpty(),
  validate,
  (req, res, next) => {
    try {
      db.prepare('DELETE FROM push_tokens WHERE token=? AND user_id=?').run(req.body.token, req.user.id);
      res.json({ success: true });
    } catch (e) { next(e); }
  }
);

// POST /api/notifications/subscribe — Subscribe user to camera alerts
router.post('/subscribe',
  verifyToken,
  body('camera_id').isString().trim().notEmpty(),
  validate,
  (req, res, next) => {
    try {
      const { camera_id } = req.body;
      const camera = db.prepare('SELECT id FROM cameras WHERE id=?').get(camera_id);
      if (!camera) return res.status(404).json({ error: 'Cámara no encontrada' });

      const { v4: uuidv4 } = require('uuid');
      db.prepare(`
        INSERT OR IGNORE INTO camera_subscriptions (id, user_id, camera_id)
        VALUES (?, ?, ?)
      `).run(uuidv4(), req.user.id, camera_id);

      res.json({ success: true });
    } catch (e) { next(e); }
  }
);

// DELETE /api/notifications/subscribe/:cameraId — Unsubscribe
router.delete('/subscribe/:cameraId', verifyToken, (req, res, next) => {
  try {
    db.prepare('DELETE FROM camera_subscriptions WHERE user_id=? AND camera_id=?')
      .run(req.user.id, req.params.cameraId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /api/notifications/subscriptions — Get user's subscriptions
router.get('/subscriptions', verifyToken, (req, res, next) => {
  try {
    const subs = db.prepare(`
      SELECT cs.camera_id, c.name FROM camera_subscriptions cs
      JOIN cameras c ON c.id = cs.camera_id
      WHERE cs.user_id = ?
    `).all(req.user.id);
    res.json(subs);
  } catch (e) { next(e); }
});

module.exports = router;
