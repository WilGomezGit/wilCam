'use strict';
const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const s3Service = require('../services/s3.service');
const { enqueueS3Upload } = require('../services/queue.service');
const db = require('../db/database');

// GET /api/cloud/status — S3 configuration status
router.get('/status', verifyToken, (req, res) => {
  res.json({
    configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET),
    bucket: process.env.AWS_S3_BUCKET || null,
    region: process.env.AWS_REGION || 'us-east-1',
    cloudfront: !!process.env.AWS_CLOUDFRONT_URL,
  });
});

// GET /api/cloud/uploads — List cloud upload jobs
router.get('/uploads', verifyToken, (req, res, next) => {
  try {
    const { status, camera_id, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT cu.*, r.filename, r.start_time, c.name as camera_name
      FROM cloud_uploads cu
      JOIN recordings r ON r.id = cu.recording_id
      JOIN cameras c ON c.id = cu.camera_id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += ' AND cu.status = ?'; params.push(status); }
    if (camera_id) { query += ' AND cu.camera_id = ?'; params.push(camera_id); }
    query += ` ORDER BY cu.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const uploads = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as c FROM cloud_uploads' + (status ? ' WHERE status=?' : '')).get(...(status ? [status] : []));
    res.json({ uploads, total: total.c });
  } catch (e) { next(e); }
});

// POST /api/cloud/upload/:recordingId — Queue recording for S3 upload
router.post('/upload/:recordingId', verifyToken, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const { recordingId } = req.params;
    const recording = db.prepare('SELECT * FROM recordings WHERE id=?').get(recordingId);
    if (!recording) return res.status(404).json({ error: 'Grabación no encontrada' });
    if (recording.cloud_uploaded) return res.status(409).json({ error: 'Ya subida a la nube' });

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_S3_BUCKET) {
      return res.status(503).json({ error: 'S3 no configurado' });
    }

    const { v4: uuidv4 } = require('uuid');
    db.prepare(`
      INSERT OR IGNORE INTO cloud_uploads (id, recording_id, camera_id, status)
      VALUES (?, ?, ?, 'pending')
    `).run(uuidv4(), recordingId, recording.camera_id);

    await enqueueS3Upload(recordingId, recording.camera_id, recording.filepath, recording.size_bytes);
    res.json({ success: true, message: 'Upload encolado' });
  } catch (e) { next(e); }
});

// POST /api/cloud/upload-all — Queue all pending recordings
router.post('/upload-all', verifyToken, requireRole('admin'), async (req, res, next) => {
  try {
    const pending = db.prepare(`
      SELECT r.* FROM recordings r
      LEFT JOIN cloud_uploads cu ON cu.recording_id = r.id
      WHERE r.cloud_uploaded = 0 AND cu.id IS NULL
        AND r.end_time IS NOT NULL
      ORDER BY r.start_time DESC
      LIMIT 100
    `).all();

    let queued = 0;
    const { v4: uuidv4 } = require('uuid');
    for (const rec of pending) {
      db.prepare(`
        INSERT OR IGNORE INTO cloud_uploads (id, recording_id, camera_id, status)
        VALUES (?, ?, ?, 'pending')
      `).run(uuidv4(), rec.id, rec.camera_id);
      await enqueueS3Upload(rec.id, rec.camera_id, rec.filepath, rec.size_bytes);
      queued++;
    }
    res.json({ success: true, queued });
  } catch (e) { next(e); }
});

// GET /api/cloud/signed-url/:recordingId — Get signed download URL
router.get('/signed-url/:recordingId', verifyToken, async (req, res, next) => {
  try {
    const recording = db.prepare('SELECT * FROM recordings WHERE id=?').get(req.params.recordingId);
    if (!recording) return res.status(404).json({ error: 'Grabación no encontrada' });
    if (!recording.cloud_uploaded || !recording.cloud_url) {
      return res.status(404).json({ error: 'No disponible en la nube' });
    }

    // Extract key from cloud_url
    const url = new URL(recording.cloud_url);
    const key = url.pathname.slice(1);
    const signedUrl = await s3Service.getSignedDownloadUrl(key, 3600);
    res.json({ url: signedUrl, expiresIn: 3600 });
  } catch (e) { next(e); }
});

// DELETE /api/cloud/:recordingId — Delete from S3
router.delete('/:recordingId', verifyToken, requireRole('admin'), async (req, res, next) => {
  try {
    const recording = db.prepare('SELECT * FROM recordings WHERE id=?').get(req.params.recordingId);
    if (!recording || !recording.cloud_url) return res.status(404).json({ error: 'No en la nube' });

    const url = new URL(recording.cloud_url);
    const key = url.pathname.slice(1);
    await s3Service.deleteObject(key);

    db.prepare('UPDATE recordings SET cloud_uploaded=0, cloud_url=NULL WHERE id=?').run(req.params.recordingId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
