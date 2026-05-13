'use strict';
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const db = require('../db/database');

function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
}

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres'),
  validate,
], async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const { accessToken, refreshToken } = generateTokens(user);
    db.prepare('UPDATE users SET refresh_token = ?, last_login = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?')
      .run(refreshToken, user.id);
    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) { next(err); }
});

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
  body('name').trim().isLength({ min: 2 }).withMessage('Nombre mínimo 2 caracteres'),
  body('role').optional().isIn(['admin', 'operator', 'viewer']).withMessage('Rol inválido'),
  validate,
], async (req, res, next) => {
  try {
    const { email, password, name, role = 'operator' } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email ya registrado' });
    }
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const hash = await bcrypt.hash(password, rounds);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?)')
      .run(id, email, name, role, hash);
    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(id);
    const { accessToken, refreshToken } = generateTokens(user);
    db.prepare('UPDATE users SET refresh_token = ? WHERE id = ?').run(refreshToken, id);
    res.status(201).json({ accessToken, refreshToken, user });
  } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token requerido'),
  validate,
], (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND refresh_token = ? AND active = 1').get(decoded.id, refreshToken);
    if (!user) {
      return res.status(401).json({ error: 'Refresh token no reconocido' });
    }
    const tokens = generateTokens(user);
    db.prepare('UPDATE users SET refresh_token = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(tokens.refreshToken, user.id);
    res.json(tokens);
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', verifyToken, (req, res, next) => {
  try {
    db.prepare('UPDATE users SET refresh_token = NULL, updated_at = datetime(\'now\') WHERE id = ?').run(req.user.id);
    res.json({ message: 'Sesión cerrada' });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res, next) => {
  try {
    const user = db.prepare('SELECT id, email, name, role, last_login, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) { next(err); }
});

// PUT /api/auth/password
router.put('/password', verifyToken, [
  body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
  body('newPassword').isLength({ min: 8 }).withMessage('Nueva contraseña mínimo 8 caracteres'),
  validate,
], async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    const hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '10'));
    db.prepare('UPDATE users SET password_hash = ?, refresh_token = NULL, updated_at = datetime(\'now\') WHERE id = ?')
      .run(hash, user.id);
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) { next(err); }
});

module.exports = router;
