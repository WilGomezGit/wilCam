'use strict';
let io;

function init(ioInstance) {
  io = ioInstance;
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

function emitRecordingUpdate(cameraId, data) {
  if (!io) return;
  io.emit('recording:update', { cameraId, ...data, ts: Date.now() });
}

function emitStreamStatus(cameraId, streaming, hlsUrl) {
  if (!io) return;
  io.emit('stream:status', { cameraId, streaming, hlsUrl, ts: Date.now() });
}

function emitSystemStats(stats) {
  if (!io) return;
  io.emit('system:stats', { ...stats, ts: Date.now() });
}

module.exports = { init, getIo, emitCameraStatus, emitEvent, emitRecordingUpdate, emitStreamStatus, emitSystemStats };
