'use strict';
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const db = require('./db/database');
const socketService = require('./services/socket.service');
const ffmpegService = require('./services/ffmpeg.service');
const redisService = require('./services/redis.service');
const webrtcService = require('./services/webrtc.service');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app = express();
const server = http.createServer(app);

// ── Socket.IO with auth ──────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:4200', credentials: true },
  transports: ['websocket', 'polling'],
  pingTimeout: 10000,
  pingInterval: 25000,
});

// Socket.IO JWT auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
  if (!token) return next(new Error('Token requerido'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Token inválido'));
  }
});

socketService.init(io);

// ── Ensure public dirs exist ─────────────────────────────────────
['public/hls', 'public/recordings', 'public/snapshots', 'public/cloud'].forEach(dir => {
  fs.mkdirSync(path.resolve(dir), { recursive: true });
});

// ── Security middleware ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '200'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo más tarde.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de autenticación.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', apiLimiter);

// ── Body parsing & compression ───────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (skip in test)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
}

// ── Static files ─────────────────────────────────────────────────
app.use('/hls', express.static(path.resolve('public/hls'), { maxAge: '0' }));
app.use('/recordings', express.static(path.resolve('public/recordings')));
app.use('/snapshots', express.static(path.resolve('public/snapshots')));
app.use('/cloud', express.static(path.resolve('public/cloud')));

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cameras', require('./routes/cameras'));
app.use('/api/streams', require('./routes/streams'));
app.use('/api/ptz', require('./routes/ptz'));
app.use('/api/recordings', require('./routes/recordings'));
app.use('/api/events', require('./routes/events'));
app.use('/api/onvif', require('./routes/onvif'));
// ── New v2 routes ─────────────────────────────────────────────────
app.use('/api/ai', require('./routes/ai'));
app.use('/api/cloud', require('./routes/cloud'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/webrtc', require('./routes/webrtc'));

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const cameras = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = \'online\' THEN 1 ELSE 0 END) as online FROM cameras').get();
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    cameras: { total: cameras.total, online: cameras.online || 0 },
    activeStreams: ffmpegService.getActiveStreams().length,
    memory: process.memoryUsage(),
  });
});

// ── System stats (protected) ─────────────────────────────────────
const { verifyToken } = require('./middleware/auth.middleware');
app.get('/api/system/stats', verifyToken, (req, res) => {
  const cameras = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = \'online\' THEN 1 ELSE 0 END) as online FROM cameras').get();
  const events = db.prepare(`SELECT COUNT(*) as today FROM events WHERE date(created_at) = date('now')`).get();
  const recordings = db.prepare('SELECT COUNT(*) as active FROM recordings WHERE end_time IS NULL').get();
  const activeStreams = ffmpegService.getActiveStreams();
  res.json({
    cameras: { total: cameras.total, online: cameras.online || 0 },
    events: { today: events.today },
    recordings: { active: recordings.active },
    streams: { active: activeStreams.length },
    memory: process.memoryUsage(),
    uptime: Math.round(process.uptime()),
  });
});

// ── 404 + Error handlers ─────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Socket.IO event handlers ─────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Conectado: ${socket.user.email} (${socket.id})`);

  socket.on('subscribe:camera', (cameraId) => {
    socket.join(`camera:${cameraId}`);
  });

  socket.on('unsubscribe:camera', (cameraId) => {
    socket.leave(`camera:${cameraId}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[WS] Desconectado: ${socket.user.email} — ${reason}`);
  });
});

// ── System stats broadcast every 15s ─────────────────────────────
setInterval(() => {
  try {
    const cameras = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = \'online\' THEN 1 ELSE 0 END) as online FROM cameras').get();
    const events = db.prepare(`SELECT COUNT(*) as today FROM events WHERE date(created_at) = date('now')`).get();
    socketService.emitSystemStats({
      cameras: { total: cameras.total, online: cameras.online || 0 },
      events: { today: events.today },
      streams: { active: ffmpegService.getActiveStreams().length },
      memory: process.memoryUsage(),
    });
  } catch (e) { /* ignore broadcast errors */ }
}, 15000);

// ── Auto-start streams on boot ────────────────────────────────────
async function autoStartStreams() {
  const cameras = db.prepare('SELECT * FROM cameras WHERE recording_enabled = 1').all();
  let started = 0;
  for (const cam of cameras) {
    try {
      await ffmpegService.startHlsStream(cam);
      started++;
      await new Promise(r => setTimeout(r, 300)); // stagger starts
    } catch (e) {
      console.error(`[BOOT] No se pudo iniciar stream para ${cam.name}: ${e.message}`);
    }
  }
  console.log(`[BOOT] ${started}/${cameras.length} streams iniciados`);
}

// ── Start server ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000');
server.listen(PORT, async () => {
  console.log(`\n🎥 WilCam Backend v2.0 — Puerto ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API:    http://localhost:${PORT}/api\n`);

  // Connect Redis (non-blocking)
  redisService.connect().catch(() => {});

  // Start background workers
  try {
    require('./workers/s3.worker').start();
    require('./workers/notification.worker').start();
    require('./workers/smart-recording.worker').start();
    require('./workers/ai-detection.worker').start();
  } catch (e) {
    console.warn('[Workers] Some workers failed to start:', e.message);
  }

  // Init WebRTC (non-blocking)
  if (process.env.ENABLE_WEBRTC === 'true') {
    webrtcService.init().catch(e => console.warn('[WebRTC] Init error:', e.message));
  }

  if (process.env.AUTO_START_STREAMS !== 'false') {
    setTimeout(autoStartStreams, 1000);
  }
});

module.exports = { app, server };
