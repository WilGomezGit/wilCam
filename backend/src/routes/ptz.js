'use strict';
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const db = require('../db/database');
const ptzService = require('../services/ptz.service');

function getCameraOnvif(cameraId, res) {
  const cam = db.prepare('SELECT * FROM cameras WHERE id = ?').get(cameraId);
  if (!cam) { res.status(404).json({ error: 'Cámara no encontrada' }); return null; }
  if (!cam.ptz_enabled) { res.status(400).json({ error: 'PTZ no habilitado en esta cámara' }); return null; }
  const host = cam.onvif_host || cam.rtsp_url.match(/rtsp:\/\/[^:@]*:[^@]*@([^:/]+)/)?.[1] || cam.rtsp_url.match(/rtsp:\/\/([^:/]+)/)?.[1];
  if (!host) { res.status(400).json({ error: 'No se pudo determinar el host ONVIF' }); return null; }
  return { ...cam, resolvedHost: host };
}

const VALID_ACTIONS = ['up','down','left','right','up-left','up-right','down-left','down-right','zoom-in','zoom-out'];

// POST /api/ptz/:cameraId/:action
router.post('/:cameraId/:action', verifyToken, [
  body('speed').optional().isFloat({ min: 0.1, max: 1.0 }).toFloat(),
  validate,
], async (req, res, next) => {
  try {
    const { cameraId, action } = req.params;
    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({ error: `Acción PTZ inválida. Válidas: ${VALID_ACTIONS.join(', ')}` });
    }
    const cam = getCameraOnvif(cameraId, res);
    if (!cam) return;
    const speed = req.body.speed || 0.5;
    await ptzService.sendOnvifPtz(cam.resolvedHost, cam.onvif_port || 80, cam.username, cam.password, action, speed);
    res.json({ success: true, action, cameraId });
  } catch (err) {
    // PTZ failures are non-critical — log and return partial success
    console.error('[PTZ] Error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// POST /api/ptz/:cameraId/stop
router.post('/:cameraId/stop', verifyToken, async (req, res, next) => {
  try {
    const cam = getCameraOnvif(req.params.cameraId, res);
    if (!cam) return;
    await ptzService.stopOnvifPtz(cam.resolvedHost, cam.onvif_port || 80, cam.username, cam.password);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/ptz/:cameraId/preset/:presetToken
router.post('/:cameraId/preset/:presetToken', verifyToken, async (req, res, next) => {
  try {
    const cam = getCameraOnvif(req.params.cameraId, res);
    if (!cam) return;
    await ptzService.goToPreset(cam.resolvedHost, cam.onvif_port || 80, cam.username, cam.password, req.params.presetToken);
    res.json({ success: true, preset: req.params.presetToken });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
