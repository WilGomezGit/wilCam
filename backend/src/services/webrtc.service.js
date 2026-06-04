'use strict';
/**
 * WebRTC streaming service using mediasoup.
 * Falls back gracefully if mediasoup is not installed.
 * HLS streaming remains the primary path; WebRTC provides sub-second latency.
 */

let mediasoup = null;
try {
  mediasoup = require('mediasoup');
} catch {
  console.log('[WebRTC] mediasoup not installed — WebRTC disabled. Install with: npm install mediasoup');
}

const WEBRTC_ENABLED = () => process.env.ENABLE_WEBRTC === 'true' && mediasoup !== null;

let worker = null;
let router = null;
const transports = new Map();   // transportId → transport
const producers = new Map();    // cameraId → producer
const consumers = new Map();    // consumerId → consumer

const MEDIA_CODECS = [
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: { 'x-google-start-bitrate': 1000 },
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1,
    },
  },
  { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
];

async function init() {
  if (!WEBRTC_ENABLED()) return;

  try {
    worker = await mediasoup.createWorker({
      logLevel: 'warn',
      rtcMinPort: parseInt(process.env.WEBRTC_MIN_PORT || '40000'),
      rtcMaxPort: parseInt(process.env.WEBRTC_MAX_PORT || '49999'),
    });

    worker.on('died', () => {
      console.error('[WebRTC] mediasoup worker died, restarting in 2s');
      setTimeout(() => init(), 2000);
    });

    router = await worker.createRouter({ mediaCodecs: MEDIA_CODECS });
    console.log('[WebRTC] mediasoup router ready');
  } catch (e) {
    console.error('[WebRTC] Init failed:', e.message);
  }
}

async function createProducerTransport(cameraId) {
  if (!router) throw new Error('WebRTC not initialized');

  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.WEBRTC_ANNOUNCED_IP || '127.0.0.1' }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });

  transports.set(transport.id, transport);

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

async function connectProducerTransport(transportId, dtlsParameters) {
  const transport = transports.get(transportId);
  if (!transport) throw new Error('Transport not found');
  await transport.connect({ dtlsParameters });
}

async function produce(transportId, cameraId, kind, rtpParameters) {
  const transport = transports.get(transportId);
  if (!transport) throw new Error('Transport not found');

  const producer = await transport.produce({ kind, rtpParameters });
  producers.set(cameraId, producer);

  producer.on('transportclose', () => {
    producers.delete(cameraId);
  });

  return { id: producer.id };
}

async function createConsumerTransport() {
  if (!router) throw new Error('WebRTC not initialized');

  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.WEBRTC_ANNOUNCED_IP || '127.0.0.1' }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });

  transports.set(transport.id, transport);

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

async function consume(transportId, cameraId, rtpCapabilities) {
  if (!router) throw new Error('WebRTC not initialized');

  const producer = producers.get(cameraId);
  if (!producer) throw new Error(`No producer for camera ${cameraId}`);

  if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
    throw new Error('Cannot consume — incompatible RTP capabilities');
  }

  const transport = transports.get(transportId);
  if (!transport) throw new Error('Transport not found');

  const consumer = await transport.consume({
    producerId: producer.id,
    rtpCapabilities,
    paused: false,
  });

  consumers.set(consumer.id, consumer);

  return {
    id: consumer.id,
    producerId: producer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
  };
}

async function closeTransport(transportId) {
  const transport = transports.get(transportId);
  if (transport) {
    transport.close();
    transports.delete(transportId);
  }
}

function getRtpCapabilities() {
  return router?.rtpCapabilities || null;
}

function isEnabled() {
  return WEBRTC_ENABLED() && router !== null;
}

module.exports = {
  init,
  isEnabled,
  getRtpCapabilities,
  createProducerTransport,
  connectProducerTransport,
  produce,
  createConsumerTransport,
  consume,
  closeTransport,
};
