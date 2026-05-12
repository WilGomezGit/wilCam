let io;

function init(server) {
  const { Server } = require('socket.io');
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200';

  io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[WS] client connected: ${socket.id}`);

    socket.on('subscribe:camera', (cameraId) => {
      socket.join(`camera:${cameraId}`);
    });

    socket.on('unsubscribe:camera', (cameraId) => {
      socket.leave(`camera:${cameraId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[WS] client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIo() {
  return io;
}

// Broadcast helpers
function emitCameraStatus(cameraId, status) {
  if (!io) return;
  io.emit('camera:status', { cameraId, status, ts: Date.now() });
}

function emitEvent(event) {
  if (!io) return;
  io.emit('event:new', event);
  io.to(`camera:${event.camera_id}`).emit('camera:event', event);
}

function emitRecordingUpdate(cameraId, recording) {
  if (!io) return;
  io.emit('recording:update', { cameraId, recording });
}

function emitStreamStatus(cameraId, streaming, hlsUrl) {
  if (!io) return;
  io.emit('stream:status', { cameraId, streaming, hlsUrl, ts: Date.now() });
}

function emitSystemStats(stats) {
  if (!io) return;
  io.emit('system:stats', stats);
}

module.exports = { init, getIo, emitCameraStatus, emitEvent, emitRecordingUpdate, emitStreamStatus, emitSystemStats };
