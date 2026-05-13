'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const { verifyToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const webrtcService = require('../services/webrtc.service');

// GET /api/webrtc/capabilities — Get router RTP capabilities
router.get('/capabilities', verifyToken, (req, res) => {
  if (!webrtcService.isEnabled()) {
    return res.status(503).json({
      error: 'WebRTC not enabled',
      hint: 'Set ENABLE_WEBRTC=true and install mediasoup, or use HLS streaming',
    });
  }
  res.json({ rtpCapabilities: webrtcService.getRtpCapabilities() });
});

// POST /api/webrtc/transport — Create WebRTC consumer transport
router.post('/transport',
  verifyToken,
  async (req, res, next) => {
    try {
      if (!webrtcService.isEnabled()) return res.status(503).json({ error: 'WebRTC not enabled' });
      const transport = await webrtcService.createConsumerTransport();
      res.json(transport);
    } catch (e) { next(e); }
  }
);

// POST /api/webrtc/transport/:transportId/connect — Connect transport
router.post('/transport/:transportId/connect',
  verifyToken,
  body('dtlsParameters').isObject(),
  validate,
  async (req, res, next) => {
    try {
      if (!webrtcService.isEnabled()) return res.status(503).json({ error: 'WebRTC not enabled' });
      await webrtcService.connectProducerTransport(req.params.transportId, req.body.dtlsParameters);
      res.json({ success: true });
    } catch (e) { next(e); }
  }
);

// POST /api/webrtc/consume — Start consuming a camera stream
router.post('/consume',
  verifyToken,
  body('transportId').isString().notEmpty(),
  body('cameraId').isString().notEmpty(),
  body('rtpCapabilities').isObject(),
  validate,
  async (req, res, next) => {
    try {
      if (!webrtcService.isEnabled()) return res.status(503).json({ error: 'WebRTC not enabled' });
      const { transportId, cameraId, rtpCapabilities } = req.body;
      const params = await webrtcService.consume(transportId, cameraId, rtpCapabilities);
      res.json(params);
    } catch (e) { next(e); }
  }
);

// DELETE /api/webrtc/transport/:transportId — Close transport
router.delete('/transport/:transportId', verifyToken, async (req, res, next) => {
  try {
    await webrtcService.closeTransport(req.params.transportId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /api/webrtc/status — Active streams info
router.get('/status', verifyToken, (req, res) => {
  res.json({ enabled: webrtcService.isEnabled() });
});

module.exports = router;
