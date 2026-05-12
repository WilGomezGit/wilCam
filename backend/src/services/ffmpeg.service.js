const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const HLS_DIR = path.resolve(process.env.HLS_OUTPUT_DIR || './public/hls');
const REC_DIR = path.resolve(process.env.RECORDINGS_DIR || './public/recordings');

// Ensure output directories exist
[HLS_DIR, REC_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// Active FFmpeg processes keyed by cameraId
const activeStreams = new Map();
const activeRecordings = new Map();

function getHlsDir(cameraId) {
  const dir = path.join(HLS_DIR, cameraId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getRecDir(cameraId) {
  const dir = path.join(REC_DIR, cameraId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Start RTSP → HLS transcoding for a camera.
 * Returns the path to the .m3u8 playlist.
 */
function startHlsStream(cameraId, rtspUrl) {
  if (activeStreams.has(cameraId)) {
    return getM3u8Path(cameraId);
  }

  const dir = getHlsDir(cameraId);
  const playlist = path.join(dir, 'index.m3u8');

  const proc = ffmpeg(rtspUrl)
    .inputOptions([
      '-rtsp_transport tcp',
      '-stimeout 5000000',   // 5s RTSP timeout
      '-re',
    ])
    .videoCodec('libx264')
    .audioCodec('aac')
    .outputOptions([
      '-preset ultrafast',
      '-tune zerolatency',
      '-g 25',              // keyframe every 1s at 25fps
      '-sc_threshold 0',
      '-f hls',
      '-hls_time 2',
      '-hls_list_size 5',
      '-hls_flags delete_segments+append_list',
      `-hls_segment_filename ${path.join(dir, 'seg%05d.ts')}`,
    ])
    .output(playlist)
    .on('start', (cmd) => console.log(`[HLS] ${cameraId} started`))
    .on('error', (err) => {
      console.error(`[HLS] ${cameraId} error: ${err.message}`);
      activeStreams.delete(cameraId);
      // Auto-reconnect after 5s
      setTimeout(() => startHlsStream(cameraId, rtspUrl), 5000);
    })
    .on('end', () => {
      console.log(`[HLS] ${cameraId} ended`);
      activeStreams.delete(cameraId);
    });

  proc.run();
  activeStreams.set(cameraId, { proc, rtspUrl, playlist, startedAt: new Date() });
  return playlist;
}

function stopHlsStream(cameraId) {
  const entry = activeStreams.get(cameraId);
  if (entry) {
    entry.proc.kill('SIGKILL');
    activeStreams.delete(cameraId);
  }
}

function getM3u8Path(cameraId) {
  return path.join(getHlsDir(cameraId), 'index.m3u8');
}

function getM3u8Url(cameraId) {
  return `/hls/${cameraId}/index.m3u8`;
}

/**
 * Start continuous recording for a camera.
 * Segments are split every 10 minutes.
 */
function startRecording(cameraId, rtspUrl) {
  if (activeRecordings.has(cameraId)) return;

  const dir = getRecDir(cameraId);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const segPattern = path.join(dir, `rec_%Y%m%d_%H%M%S.mp4`);

  const proc = ffmpeg(rtspUrl)
    .inputOptions(['-rtsp_transport tcp', '-stimeout 5000000'])
    .videoCodec('copy')
    .audioCodec('aac')
    .outputOptions([
      '-f segment',
      '-segment_time 600',   // 10 minutes per segment
      '-segment_atclocktime 1',
      '-segment_format mp4',
      '-reset_timestamps 1',
      '-strftime 1',
    ])
    .output(segPattern)
    .on('start', () => console.log(`[REC] ${cameraId} started`))
    .on('error', (err) => {
      console.error(`[REC] ${cameraId} error: ${err.message}`);
      activeRecordings.delete(cameraId);
      setTimeout(() => startRecording(cameraId, rtspUrl), 5000);
    });

  proc.run();
  activeRecordings.set(cameraId, { proc, rtspUrl, dir, startedAt: new Date() });
}

function stopRecording(cameraId) {
  const entry = activeRecordings.get(cameraId);
  if (entry) {
    entry.proc.kill('SIGKILL');
    activeRecordings.delete(cameraId);
  }
}

/**
 * Capture a single snapshot from an RTSP stream.
 */
function captureSnapshot(cameraId, rtspUrl) {
  return new Promise((resolve, reject) => {
    const snapDir = path.resolve(process.env.SNAPSHOTS_DIR || './public/snapshots', cameraId);
    fs.mkdirSync(snapDir, { recursive: true });
    const filename = `snap_${Date.now()}.jpg`;
    const filepath = path.join(snapDir, filename);

    ffmpeg(rtspUrl)
      .inputOptions(['-rtsp_transport tcp', '-stimeout 3000000'])
      .frames(1)
      .output(filepath)
      .on('end', () => resolve({ filename, path: filepath, url: `/snapshots/${cameraId}/${filename}` }))
      .on('error', reject)
      .run();
  });
}

function getActiveStreams() {
  return Array.from(activeStreams.entries()).map(([id, v]) => ({
    cameraId: id,
    startedAt: v.startedAt,
    url: getM3u8Url(id),
  }));
}

function isStreaming(cameraId) {
  return activeStreams.has(cameraId);
}

function isRecording(cameraId) {
  return activeRecordings.has(cameraId);
}

module.exports = {
  startHlsStream,
  stopHlsStream,
  getM3u8Url,
  startRecording,
  stopRecording,
  captureSnapshot,
  getActiveStreams,
  isStreaming,
  isRecording,
};
