'use strict';
const router = require('express').Router();
const { body, param } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const db = require('../db/database');

// GET /api/organizations — List organizations (admin only)
router.get('/', verifyToken, requireRole('admin'), (req, res, next) => {
  try {
    const orgs = db.prepare(`
      SELECT o.*, COUNT(DISTINCT om.user_id) as member_count, COUNT(DISTINCT c.id) as camera_count
      FROM organizations o
      LEFT JOIN org_members om ON om.org_id = o.id
      LEFT JOIN org_cameras oc ON oc.org_id = o.id
      LEFT JOIN cameras c ON c.id = oc.camera_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `).all();
    res.json(orgs);
  } catch (e) { next(e); }
});

// POST /api/organizations — Create organization
router.post('/',
  verifyToken, requireRole('admin'),
  body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Nombre requerido (2-100 chars)'),
  body('slug').optional().isSlug().withMessage('Slug inválido'),
  validate,
  (req, res, next) => {
    try {
      const { name, slug } = req.body;
      const orgSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const id = uuidv4();

      db.prepare(`
        INSERT INTO organizations (id, name, slug, owner_id) VALUES (?, ?, ?, ?)
      `).run(id, name, orgSlug, req.user.id);

      // Add creator as owner member
      db.prepare(`
        INSERT INTO org_members (id, org_id, user_id, role) VALUES (?, ?, ?, 'owner')
      `).run(uuidv4(), id, req.user.id);

      const org = db.prepare('SELECT * FROM organizations WHERE id=?').get(id);
      res.status(201).json(org);
    } catch (e) {
      if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Slug ya existe' });
      next(e);
    }
  }
);

// GET /api/organizations/:id — Get organization details
router.get('/:id', verifyToken, (req, res, next) => {
  try {
    const org = db.prepare('SELECT * FROM organizations WHERE id=?').get(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organización no encontrada' });

    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.role as system_role, om.role as org_role, om.created_at as joined_at
      FROM org_members om
      JOIN users u ON u.id = om.user_id
      WHERE om.org_id = ?
    `).all(req.params.id);

    const cameras = db.prepare(`
      SELECT c.id, c.name, c.location, c.status
      FROM org_cameras oc
      JOIN cameras c ON c.id = oc.camera_id
      WHERE oc.org_id = ?
    `).all(req.params.id);

    res.json({ ...org, members, cameras });
  } catch (e) { next(e); }
});

// POST /api/organizations/:id/invite — Invite user to organization
router.post('/:id/invite',
  verifyToken, requireRole('admin'),
  body('email').isEmail().normalizeEmail(),
  body('org_role').isIn(['viewer', 'operator', 'admin']).withMessage('Rol inválido'),
  validate,
  (req, res, next) => {
    try {
      const { email, org_role } = req.body;
      const user = db.prepare('SELECT id FROM users WHERE email=?').get(email);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      const org = db.prepare('SELECT id FROM organizations WHERE id=?').get(req.params.id);
      if (!org) return res.status(404).json({ error: 'Organización no encontrada' });

      const existing = db.prepare('SELECT id FROM org_members WHERE org_id=? AND user_id=?').get(req.params.id, user.id);
      if (existing) return res.status(409).json({ error: 'Usuario ya es miembro' });

      db.prepare('INSERT INTO org_members (id, org_id, user_id, role) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), req.params.id, user.id, org_role);

      res.json({ success: true, message: 'Usuario agregado a la organización' });
    } catch (e) { next(e); }
  }
);

// DELETE /api/organizations/:id/members/:userId — Remove member
router.delete('/:id/members/:userId', verifyToken, requireRole('admin'), (req, res, next) => {
  try {
    db.prepare('DELETE FROM org_members WHERE org_id=? AND user_id=?').run(req.params.id, req.params.userId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/organizations/:id/cameras — Assign camera to org
router.post('/:id/cameras',
  verifyToken, requireRole('admin'),
  body('camera_id').isString().notEmpty(),
  validate,
  (req, res, next) => {
    try {
      const { camera_id } = req.body;
      db.prepare('INSERT OR IGNORE INTO org_cameras (id, org_id, camera_id) VALUES (?, ?, ?)')
        .run(uuidv4(), req.params.id, camera_id);
      res.json({ success: true });
    } catch (e) { next(e); }
  }
);

module.exports = router;
