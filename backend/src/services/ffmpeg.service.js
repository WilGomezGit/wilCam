'use strict';
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config();

const HLS_DIR = path.resolve(process.env.HLS_OUTPUT_DIR || './public/hls');
const REC_DIR = path.resolve(process.env.RECORDINGS_DIR || './public/recordings');
const SNAP_DIR = path.resolve(process.env.SNAPSHOTS_DIR || './public/snapshots');

// Ensure output directories exist
[HLS_DIR, REC_DIR, SNAP_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

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
 * Accepts either a camera object (with .id and .rtsp_url) or legacy (cameraId, rtspUrl) args.
 */
function startHlsStream(cameraOrId, rtspUrlLegacy) {
  const cameraId = typeof cameraOrId === 'object' ? cameraOrId.id : cameraOrId;
  const rtspUrl  = typeof cameraOrId === 'object' ? cameraOrId.rtsp_url : rtspUrlLegacy;

  if (activeStreams.has(cameraId)) {
    return Promise.resolve(`/hls/${cameraId}/index.m3u8`);
  }

  return new Promise((resolve, reject) => {
    const dir = getHlsDir(cameraId);
    const playlist = path.join(dir, 'index.m3u8');

    const command = ffmpeg(rtspUrl)
      .inputOptions([
        '-rtsp_transport tcp',
        '-stimeout 5000000',
        '-re',
      ])
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset ultrafast',
        '-tune zerolatency',
        '-g 25',
        '-sc_threshold 0',
        '-f hls',
        '-hls_time 2',
        '-hls_list_size 5',
        '-hls_flags delete_segments+append_list',
        `-hls_segment_filename ${path.join(dir, 'seg%05d.ts')}`,
      ])
      .output(playlist)
      .on('start', (cmd) => {
        console.log(`[HLS] ${cameraId} started`);
        resolve(`/hls/${cameraId}/index.m3u8`);
      })
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

    command.run();
    activeStreams.set(cameraId, { process: command, rtspUrl, startedAt: new Date().toISOString() });
  });
}

function stopHlsStream(cameraId) {
  return new Promise((resolve) => {
    const entry = activeStreams.get(cameraId);
    if (entry) {
      try { entry.process.kill('SIGKILL'); } catch (_) {}
      activeStreams.delete(cameraId);
    }
    resolve();
  });
}

/**
 * Start continuous recording for a camera.
 * Accepts either a camera object or legacy (cameraId, rtspUrl) args.
 */
function startRecording(cameraOrId, rtspUrlOrFilepath, filepathLegacy) {
  const cameraId = typeof cameraOrId === 'object' ? cameraOrId.id : cameraOrId;
  const rtspUrl  = typeof cameraOrId === 'object' ? cameraOrId.rtsp_url : rtspUrlOrFilepath;

  if (activeRecordings.has(cameraId)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const dir = getRecDir(cameraId);
    const segPattern = path.join(dir, `rec_%Y%m%d_%H%M%S.mp4`);

    const command = ffmpeg(rtspUrl)
      .inputOptions(['-rtsp_transport tcp', '-stimeout 5000000'])
      .videoCodec('copy')
      .audioCodec('aac')
      .outputOptions([
        '-f segment',
        '-segment_time 600',
        '-segment_atclocktime 1',
        '-segment_format mp4',
        '-reset_timestamps 1',
        '-strftime 1',
      ])
      .output(segPattern)
      .on('start', () => {
        console.log(`[REC] ${cameraId} started`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`[REC] ${cameraId} error: ${err.message}`);
        activeRecordings.delete(cameraId);
        setTimeout(() => startRecording(cameraId, rtspUrl), 5000);
      });

    command.run();
    activeRecordings.set(cameraId, { process: command, rtspUrl, dir, startedAt: new Date().toISOString() });
  });
}

function stopRecording(cameraId) {
  return new Promise((resolve) => {
    const entry = activeRecordings.get(cameraId);
    if (entry) {
      try { entry.process.kill('SIGKILL'); } catch (_) {}
      activeRecordings.delete(cameraId);
    }
    resolve();
  });
}

/**
 * Capture a single snapshot from an RTSP stream.
 * Accepts a camera object or legacy (cameraId, rtspUrl) args.
 */
function captureSnapshot(cameraOrId, rtspUrlLegacy) {
  const cameraId = typeof cameraOrId === 'object' ? cameraOrId.id : cameraOrId;
  const rtspUrl  = typeof cameraOrId === 'object' ? cameraOrId.rtsp_url : rtspUrlLegacy;

  return new Promise((resolve, reject) => {
    const snapDir = path.join(SNAP_DIR, cameraId);
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

function isStreaming(cameraId) {
  return activeStreams.has(cameraId);
}

function isRecording(cameraId) {
  return activeRecordings.has(cameraId);
}

function getActiveStreams() {
  return Array.from(activeStreams.keys()).map(id => ({
    cameraId: id,
    hlsUrl: `/hls/${id}/index.m3u8`,
    startedAt: activeStreams.get(id)?.startedAt || null,
  }));
}

function testRtspConnection(rtspUrl) {
  return new Promise((resolve) => {
    const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
    const proc = spawn(ffprobePath, [
      '-v', 'quiet', '-print_format', 'json', '-show_streams',
      '-rtsp_transport', 'tcp', '-timeout', '4000000',
      rtspUrl,
    ]);
    const timer = setTimeout(() => { proc.kill(); resolve(false); }, 5000);
    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
    proc.on('error', () => { clearTimeout(timer); resolve(false); });
  });
}

module.exports = {
  startHlsStream,
  stopHlsStream,
  startRecording,
  stopRecording,
  captureSnapshot,
  isStreaming,
  isRecording,
  getActiveStreams,
  testRtspConnection,
};
