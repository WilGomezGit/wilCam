require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');

const socketSvc = require('./services/socket.service');
const ffmpegSvc = require('./services/ffmpeg.service');
const { getDb } = require('./db/database');

const app = express();
const server = http.createServer(app);

// Init Socket.IO
socketSvc.init(server);

// Public directories
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
['hls', 'recordings', 'snapshots'].forEach(d => {
  fs.mkdirSync(path.join(PUBLIC_DIR, d), { recursive: true });
});

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:4200' }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve HLS segments, recordings, and snapshots
app.use('/hls', express.static(path.join(PUBLIC_DIR, 'hls')));
app.use('/recordings', express.static(path.join(PUBLIC_DIR, 'recordings')));
app.use('/snapshots', express.static(path.join(PUBLIC_DIR, 'snapshots')));

// API Routes
app.use('/api/cameras', require('./routes/cameras'));
app.use('/api/streams', require('./routes/streams'));
app.use('/api/ptz', require('./routes/ptz'));
app.use('/api/recordings', require('./routes/recordings'));
app.use('/api/events', require('./routes/events'));
app.use('/api/onvif', require('./routes/onvif'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', uptime: process.uptime() });
});

// System stats endpoint
app.get('/api/system/stats', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  res.json({
    cameras: {
      total: db.prepare('SELECT COUNT(*) as c FROM cameras').get().c,
      online: db.prepare("SELECT COUNT(*) as c FROM cameras WHERE status = 'online'").get().c,
    },
    events: {
      today: db.prepare("SELECT COUNT(*) as c FROM events WHERE DATE(created_at) = ?").get(today).c,
      unreviewed: db.prepare('SELECT COUNT(*) as c FROM events WHERE reviewed = 0').get().c,
    },
    streams: {
      active: ffmpegSvc.getActiveStreams().length,
    },
    uptime: process.uptime(),
  });
});

// Auto-start HLS for cameras with recording_enabled when server starts
function autoStartStreams() {
  const db = getDb();
  const cameras = db.prepare("SELECT * FROM cameras WHERE status = 'online' AND recording_enabled = 1").all();
  cameras.forEach(cam => {
    console.log(`[AUTO] Starting HLS for ${cam.name}`);
    try {
      ffmpegSvc.startHlsStream(cam.id, cam.rtsp_url);
    } catch (err) {
      console.warn(`[AUTO] Could not start HLS for ${cam.id}: ${err.message}`);
    }
  });
}

// Periodic system stats broadcast
function startStatsBroadcast() {
  setInterval(() => {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    socketSvc.emitSystemStats({
      cameras: db.prepare("SELECT COUNT(*) as c FROM cameras WHERE status = 'online'").get().c,
      events: db.prepare("SELECT COUNT(*) as c FROM events WHERE DATE(created_at) = ?").get(today).c,
      streams: ffmpegSvc.getActiveStreams().length,
      ts: Date.now(),
    });
  }, 10000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WilCam backend running on http://localhost:${PORT}`);
  // Auto-start streams (will fail gracefully if no cameras reachable)
  setTimeout(autoStartStreams, 1000);
  startStatsBroadcast();
});
