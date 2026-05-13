'use strict';
const db = require('../db/database');

const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

async function sendToCamera(cameraId, title, body, data = {}) {
  const tokens = _getTokensForCamera(cameraId);
  if (!tokens.length) return;
  return _sendBatch(tokens, { title, body }, data);
}

async function sendToAll(title, body, data = {}) {
  const tokens = _getAllTokens();
  if (!tokens.length) return;
  return _sendBatch(tokens, { title, body }, data);
}

async function sendToUser(userId, title, body, data = {}) {
  const tokens = _getTokensForUser(userId);
  if (!tokens.length) return;
  return _sendBatch(tokens, { title, body }, data);
}

async function _sendBatch(tokens, notification, data = {}) {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    console.warn('[FCM] FCM_SERVER_KEY not configured');
    return null;
  }

  // Send in chunks of 500 (FCM limit)
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 500) {
    chunks.push(tokens.slice(i, i + 500));
  }

  const results = [];
  for (const chunk of chunks) {
    try {
      const { default: fetch } = await import('node-fetch');
      const resp = await fetch(FCM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${serverKey}`,
        },
        body: JSON.stringify({
          registration_ids: chunk,
          notification,
          data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
          priority: 'high',
        }),
      });
      const result = await resp.json();
      results.push(result);

      // Remove invalid tokens
      if (result.results) {
        result.results.forEach((r, i) => {
          if (r.error === 'InvalidRegistration' || r.error === 'NotRegistered') {
            _removeToken(chunk[i]);
          }
        });
      }
    } catch (e) {
      console.error('[FCM] Send failed:', e.message);
    }
  }
  return results;
}

function _getTokensForCamera(cameraId) {
  try {
    // Get tokens for users who have subscribed to this camera
    const rows = db.prepare(`
      SELECT DISTINCT pt.token FROM push_tokens pt
      JOIN camera_subscriptions cs ON cs.user_id = pt.user_id
      WHERE cs.camera_id = ? AND pt.token IS NOT NULL
    `).all(cameraId);
    return rows.map(r => r.token);
  } catch {
    return [];
  }
}

function _getAllTokens() {
  try {
    const rows = db.prepare('SELECT token FROM push_tokens WHERE token IS NOT NULL').all();
    return rows.map(r => r.token);
  } catch {
    return [];
  }
}

function _getTokensForUser(userId) {
  try {
    const rows = db.prepare('SELECT token FROM push_tokens WHERE user_id=? AND token IS NOT NULL').all(userId);
    return rows.map(r => r.token);
  } catch {
    return [];
  }
}

function _removeToken(token) {
  try {
    db.prepare('DELETE FROM push_tokens WHERE token=?').run(token);
  } catch {}
}

module.exports = { sendToCamera, sendToAll, sendToUser };
