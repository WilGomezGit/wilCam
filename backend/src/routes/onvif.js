'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const onvifService = require('../services/onvif.service');

// GET /api/onvif/discover
router.get('/discover', verifyToken, async (req, res, next) => {
  try {
    const cameras = await onvifService.discoverCameras();
    res.json({ cameras, count: cameras.length });
  } catch (err) { next(err); }
});

// POST /api/onvif/stream-uri
router.post('/stream-uri', verifyToken, [
  body('host').trim().isIP().withMessage('IP inválida'),
  body('port').optional().isInt({ min: 1, max: 65535 }).toInt(),
  body('username').optional().trim(),
  body('password').optional().trim(),
  validate,
], async (req, res, next) => {
  try {
    const { host, port = 80, username = 'admin', password = '' } = req.body;
    const uri = await onvifService.getStreamUri(host, port, username, password);
    res.json({ rtspUrl: uri });
  } catch (err) { next(err); }
});

// POST /api/onvif/device-info
router.post('/device-info', verifyToken, [
  body('host').trim().isIP().withMessage('IP inválida'),
  body('port').optional().isInt({ min: 1, max: 65535 }).toInt(),
  body('username').optional().trim(),
  body('password').optional().trim(),
  validate,
], async (req, res, next) => {
  try {
    const { host, port = 80, username = 'admin', password = '' } = req.body;
    const info = await onvifService.getDeviceInfo(host, port, username, password);
    res.json(info);
  } catch (err) { next(err); }
});

module.exports = router;
