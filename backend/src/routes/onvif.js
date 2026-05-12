const express = require('express');
const router = express.Router();
const onvifSvc = require('../services/onvif.service');

// GET /api/onvif/discover
router.get('/discover', async (req, res) => {
  try {
    const timeout = parseInt(req.query.timeout) || 3000;
    const cameras = await onvifSvc.discoverCameras(timeout);
    res.json(cameras);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/onvif/stream-uri
router.post('/stream-uri', async (req, res) => {
  const { host, port, username, password, profileToken } = req.body;
  if (!host) return res.status(400).json({ error: 'host is required' });
  try {
    const uri = await onvifSvc.getStreamUri(host, port, username, password, profileToken);
    res.json({ uri });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/onvif/device-info
router.post('/device-info', async (req, res) => {
  const { host, port, username, password } = req.body;
  if (!host) return res.status(400).json({ error: 'host is required' });
  try {
    const info = await onvifSvc.getDeviceInfo(host, port, username, password);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
