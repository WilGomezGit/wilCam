'use strict';
/**
 * PTZ Service — multi-protocol support
 *
 * Protocols supported:
 *   'cgi'   — HTTP CGI (Hi3510 format, used by Cam720 and most Chinese IP cameras)
 *   'onvif' — ONVIF SOAP (Hikvision, Dahua, Axis, etc.)
 *   'auto'  — try CGI first, fall back to ONVIF (default)
 */

const http = require('http');
const crypto = require('crypto');

// ── CGI Action map (Hi3510 protocol) ────────────────────────────────────────

const CGI_ACTION_MAP = {
  up:           'up',
  down:         'down',
  left:         'left',
  right:        'right',
  'up-left':    'upleft',
  'up-right':   'upright',
  'down-left':  'downleft',
  'down-right': 'downright',
  'zoom-in':    'zoomin',
  'zoom-out':   'zoomout',
  stop:         'stop',
};

// CGI speed scale: 0.1–1.0 → 1–10
function cgiSpeed(speed) {
  return Math.max(1, Math.min(10, Math.round(speed * 10)));
}

/**
 * Send PTZ move via HTTP CGI (Hi3510 / Cam720 protocol).
 * GET http://IP:port/web/cgi-bin/hi3510/ptzctrl.cgi?-step=0&-act=left&-speed=5
 */
function sendCgiPtz(host, port, username, password, action, speed = 0.5) {
  const act = CGI_ACTION_MAP[action] || 'stop';
  const spd = cgiSpeed(speed);
  const path = `/web/cgi-bin/hi3510/ptzctrl.cgi?-step=0&-act=${act}&-speed=${spd}`;
  return httpGet(host, port || 80, path, username, password);
}

function stopCgiPtz(host, port, username, password) {
  return sendCgiPtz(host, port, username, password, 'stop', 0.5);
}

// ── ONVIF PTZ ────────────────────────────────────────────────────────────────

const VELOCITY_MAP = {
  up:           { x: 0,  y: 1,  zoom: 0 },
  down:         { x: 0,  y: -1, zoom: 0 },
  left:         { x: -1, y: 0,  zoom: 0 },
  right:        { x: 1,  y: 0,  zoom: 0 },
  'up-left':    { x: -1, y: 1,  zoom: 0 },
  'up-right':   { x: 1,  y: 1,  zoom: 0 },
  'down-left':  { x: -1, y: -1, zoom: 0 },
  'down-right': { x: 1,  y: -1, zoom: 0 },
  'zoom-in':    { x: 0,  y: 0,  zoom: 1 },
  'zoom-out':   { x: 0,  y: 0,  zoom: -1 },
  stop:         { x: 0,  y: 0,  zoom: 0 },
};

/**
 * Discover the first PTZ-capable profile token from the camera.
 * Falls back to a list of common tokens if discovery fails.
 */
async function getProfileToken(host, port, username, password) {
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  <s:Header>${wsSecurityHeader(username, password)}</s:Header>
  <s:Body><trt:GetProfiles/></s:Body>
</s:Envelope>`;

  try {
    const { body } = await postSoap(host, port, '/onvif/media', soap);
    // Extract all profile tokens
    const matches = [...body.matchAll(/token="([^"]+)"/g)].map(m => m[1]);
    if (matches.length > 0) return matches[0];
    // Alternative tag format
    const tagMatch = body.match(/<[^:]*token[^>]*>([^<]+)<\/[^:]*token>/);
    if (tagMatch) return tagMatch[1].trim();
  } catch (e) {
    // ignore — fall through to common tokens
  }

  // Common tokens used by various manufacturers
  return 'Profile_1';
}

async function sendOnvifPtz(host, port, username, password, action, speed = 0.5) {
  const s = Math.min(1, Math.max(0.1, speed));
  const { x, y, zoom } = VELOCITY_MAP[action] || VELOCITY_MAP.stop;
  const token = await getProfileToken(host, port, username, password);

  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl"
            xmlns:tt="http://www.onvif.org/ver10/schema">
  <s:Header>${wsSecurityHeader(username, password)}</s:Header>
  <s:Body>
    <tptz:ContinuousMove>
      <tptz:ProfileToken>${token}</tptz:ProfileToken>
      <tptz:Velocity>
        <tt:PanTilt x="${(x * s).toFixed(2)}" y="${(y * s).toFixed(2)}"/>
        <tt:Zoom x="${(zoom * s).toFixed(2)}"/>
      </tptz:Velocity>
    </tptz:ContinuousMove>
  </s:Body>
</s:Envelope>`;

  return postSoap(host, port, '/onvif/PTZ', soap);
}

async function stopOnvifPtz(host, port, username, password) {
  const token = await getProfileToken(host, port, username, password);
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl">
  <s:Header>${wsSecurityHeader(username, password)}</s:Header>
  <s:Body>
    <tptz:Stop>
      <tptz:ProfileToken>${token}</tptz:ProfileToken>
      <tptz:PanTilt>true</tptz:PanTilt>
      <tptz:Zoom>true</tptz:Zoom>
    </tptz:Stop>
  </s:Body>
</s:Envelope>`;
  return postSoap(host, port, '/onvif/PTZ', soap);
}

async function goToPresetOnvif(host, port, username, password, presetToken) {
  const profileToken = await getProfileToken(host, port, username, password);
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl">
  <s:Header>${wsSecurityHeader(username, password)}</s:Header>
  <s:Body>
    <tptz:GotoPreset>
      <tptz:ProfileToken>${profileToken}</tptz:ProfileToken>
      <tptz:PresetToken>${presetToken}</tptz:PresetToken>
    </tptz:GotoPreset>
  </s:Body>
</s:Envelope>`;
  return postSoap(host, port, '/onvif/PTZ', soap);
}

// ── WS-Security header with digest auth ─────────────────────────────────────

function wsSecurityHeader(username, password) {
  if (!username) return '';
  const nonce = crypto.randomBytes(16).toString('base64');
  const created = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const nonceDecoded = Buffer.from(nonce, 'base64');
  const digest = crypto.createHash('sha1')
    .update(Buffer.concat([nonceDecoded, Buffer.from(created), Buffer.from(password || '')]))
    .digest('base64');

  return `<Security xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
    xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <UsernameToken>
      <Username>${username}</Username>
      <Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${digest}</Password>
      <Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonce}</Nonce>
      <wsu:Created>${created}</wsu:Created>
    </UsernameToken>
  </Security>`;
}

// ── Unified API (called by route) ────────────────────────────────────────────

/**
 * camera object has: resolvedHost, onvif_port, username, password, ptz_protocol
 */
async function movePtz(camera, action, speed = 0.5) {
  const { resolvedHost, onvif_port, username, password } = camera;
  const protocol = camera.ptz_protocol || 'auto';

  if (protocol === 'onvif') {
    return sendOnvifPtz(resolvedHost, onvif_port || 80, username, password, action, speed);
  }
  if (protocol === 'cgi') {
    return sendCgiPtz(resolvedHost, onvif_port || 80, username, password, action, speed);
  }

  // 'auto': try CGI first (Cam720/Hi3510), fall back to ONVIF
  try {
    const result = await sendCgiPtz(resolvedHost, onvif_port || 80, username, password, action, speed);
    console.log(`[PTZ] CGI success for ${resolvedHost}`);
    return result;
  } catch (e) {
    console.log(`[PTZ] CGI failed (${e.message}), trying ONVIF…`);
    return sendOnvifPtz(resolvedHost, onvif_port || 80, username, password, action, speed);
  }
}

async function stopPtz(camera) {
  const { resolvedHost, onvif_port, username, password } = camera;
  const protocol = camera.ptz_protocol || 'auto';

  if (protocol === 'onvif') {
    return stopOnvifPtz(resolvedHost, onvif_port || 80, username, password);
  }
  if (protocol === 'cgi') {
    return stopCgiPtz(resolvedHost, onvif_port || 80, username, password);
  }

  try {
    return await stopCgiPtz(resolvedHost, onvif_port || 80, username, password);
  } catch (e) {
    return stopOnvifPtz(resolvedHost, onvif_port || 80, username, password);
  }
}

async function goToPreset(camera, presetToken) {
  const { resolvedHost, onvif_port, username, password } = camera;
  const protocol = camera.ptz_protocol || 'auto';

  if (protocol === 'cgi') {
    // CGI preset: GET /web/cgi-bin/hi3510/preset.cgi?-act=goto&-number=N
    const path = `/web/cgi-bin/hi3510/preset.cgi?-act=goto&-number=${presetToken}`;
    return httpGet(resolvedHost, onvif_port || 80, path, username, password);
  }
  return goToPresetOnvif(resolvedHost, onvif_port || 80, username, password, presetToken);
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function httpGet(host, port, path, username, password) {
  return new Promise((resolve, reject) => {
    const auth = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password || '')}@` : '';
    const options = {
      hostname: host,
      port: port || 80,
      path,
      method: 'GET',
      timeout: 5000,
      auth: username ? `${username}:${password || ''}` : undefined,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`CGI HTTP ${res.statusCode}: ${body.substring(0, 100)}`));
        } else {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('PTZ CGI timeout')); });
    req.end();
  });
}

function postSoap(host, port, path, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(body, 'utf8');
    const options = {
      hostname: host,
      port: port || 80,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Content-Length': data.length,
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`ONVIF HTTP ${res.statusCode}`));
        } else {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('ONVIF timeout')); });
    req.write(data);
    req.end();
  });
}

module.exports = { movePtz, stopPtz, goToPreset };
