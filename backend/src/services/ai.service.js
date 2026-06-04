'use strict';
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const { enqueueNotification, enqueueSmartRecording } = require('./queue.service');
const fcmService = require('./fcm.service');
const socketService = require('./socket.service');

const AI_URL = () => process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_ENABLED = () => process.env.ENABLE_AI !== 'false';

async function analyzeSnapshot(cameraId, snapshotPath) {
  if (!AI_ENABLED()) return null;

  try {
    const { default: fetch } = await import('node-fetch');
    const form = new FormData();
    form.append('image', fs.createReadStream(snapshotPath), path.basename(snapshotPath));
    form.append('camera_id', cameraId);

    const resp = await fetch(`${AI_URL()}/detect`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) throw new Error(`AI service returned ${resp.status}`);
    return await resp.json();
  } catch (e) {
    console.warn(`[AI] Analysis failed for camera ${cameraId}:`, e.message);
    return null;
  }
}

async function processDetectionResult(cameraId, result) {
  if (!result || !result.detections?.length) return;

  const { v4: uuidv4 } = require('uuid');
  const persons = result.detections.filter(d => d.class_name === 'person');

  for (const detection of result.detections) {
    const eventId = uuidv4();
    const metadata = JSON.stringify({
      class_name: detection.class_name,
      confidence: detection.confidence,
      bbox: detection.bbox,
      person_count: result.person_count,
      inference_ms: result.inference_ms,
      ai_model: result.model_version || 'yolov8n',
    });

    db.prepare(`
      INSERT INTO events (id, camera_id, event_type, confidence, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run(eventId, cameraId, detection.class_name === 'person' ? 'person_detected' : 'object_detected', detection.confidence, metadata);

    socketService.emitEvent({
      id: eventId,
      camera_id: cameraId,
      event_type: detection.class_name === 'person' ? 'person_detected' : 'object_detected',
      confidence: detection.confidence,
      metadata: JSON.parse(metadata),
    });

    // Trigger smart recording clip for high-confidence person detections
    if (detection.class_name === 'person' && detection.confidence > 0.7) {
      await enqueueSmartRecording(cameraId, eventId, 10, 30);

      await enqueueNotification({
        type: 'person_detected',
        cameraId,
        eventId,
        title: 'Persona detectada',
        body: `Cámara: ${cameraId} — Confianza: ${Math.round(detection.confidence * 100)}%`,
      });
    }
  }
}

async function checkAIServiceHealth() {
  try {
    const { default: fetch } = await import('node-fetch');
    const resp = await fetch(`${AI_URL()}/health`, { signal: AbortSignal.timeout(5000) });
    return resp.ok ? await resp.json() : null;
  } catch {
    return null;
  }
}

module.exports = { analyzeSnapshot, processDetectionResult, checkAIServiceHealth };
