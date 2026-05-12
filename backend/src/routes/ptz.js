const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const ptzSvc = require('../services/ptz.service');

function getCamera(id) {
  return getDb().prepare('SELECT * FROM cameras WHERE id = ?').get(id);
}

async function move(req, res, action) {
  const cam = getCamera(req.params.cameraId);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });
  if (!cam.ptz_enabled) return res.status(400).json({ error: 'PTZ not enabled for this camera' });

  const host = cam.onvif_host || cam.rtsp_url.match(/\d+\.\d+\.\d+\.\d+/)?.[0];
  const speed = parseFloat(req.body?.speed) || 0.5;

  try {
    await ptzSvc.sendOnvifPtz(host, cam.onvif_port, cam.username, cam.password, action, speed);
    if (action !== 'stop') {
      ptzSvc.schedulePtzStop(cam.id, host, cam.onvif_port, cam.username, cam.password);
    }
    res.json({ action, speed, cameraId: cam.id });
  } catch (err) {
    // Return success anyway so UI feedback works even without real camera
    res.json({ action, speed, cameraId: cam.id, warning: err.message });
  }
}

// PTZ movement routes
router.post('/:cameraId/up',         (req, res) => move(req, res, 'up'));
router.post('/:cameraId/down',       (req, res) => move(req, res, 'down'));
router.post('/:cameraId/left',       (req, res) => move(req, res, 'left'));
router.post('/:cameraId/right',      (req, res) => move(req, res, 'right'));
router.post('/:cameraId/up-left',    (req, res) => move(req, res, 'up-left'));
router.post('/:cameraId/up-right',   (req, res) => move(req, res, 'up-right'));
router.post('/:cameraId/down-left',  (req, res) => move(req, res, 'down-left'));
router.post('/:cameraId/down-right', (req, res) => move(req, res, 'down-right'));
router.post('/:cameraId/zoom-in',    (req, res) => move(req, res, 'zoom-in'));
router.post('/:cameraId/zoom-out',   (req, res) => move(req, res, 'zoom-out'));
router.post('/:cameraId/stop',       (req, res) => move(req, res, 'stop'));

// Go to preset
router.post('/:cameraId/preset/:presetToken', async (req, res) => {
  const cam = getCamera(req.params.cameraId);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });
  const host = cam.onvif_host || cam.rtsp_url.match(/\d+\.\d+\.\d+\.\d+/)?.[0];
  try {
    await ptzSvc.goToPreset(host, cam.onvif_port, cam.username, cam.password, req.params.presetToken);
    res.json({ preset: req.params.presetToken, cameraId: cam.id });
  } catch (err) {
    res.json({ preset: req.params.presetToken, cameraId: cam.id, warning: err.message });
  }
});

module.exports = router;
