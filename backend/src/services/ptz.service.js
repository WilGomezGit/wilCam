'use strict';
/**
 * PTZ Service — multi-protocol support
 *
 * Protocols supported:
 *   'cgi'      — HTTP CGI Hi3510 classic: /web/cgi-bin/hi3510/ptzctrl.cgi, speed 1-10
 *   'cgi_param'— HTTP CGI param.cgi (INSTAR / newer Hi3510): /param.cgi?cmd=ptzctrl, speed 1-63
 *   'onvif'    — ONVIF SOAP (Hikvision, Dahua, Axis, etc.)
 *   'auto'     — try cgi → cgi_param → onvif (default)
 */

const http = require('http');
const crypto = require('crypto');

// ── CGI Action map (shared by both CGI variants) ─────────────────────────────

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

// ── CGI Hi3510 classic (/web/cgi-bin/hi3510/ptzctrl.cgi, speed 1-10) ────────

function sendCgiPtz(host, port, username, password, action, speed = 0.5) {
  const act = CGI_ACTION_MAP[action] || 'stop';
  const spd = Math.max(1, Math.min(10, Math.round(speed * 10)));
  const path = `/web/cgi-bin/hi3510/ptzctrl.cgi?-step=0&-act=${act}&-speed=${spd}`;
  return httpGet(host, port || 80, path, username, password);
}

function stopCgiPtz(host, port, username, password) {
  const path = `/web/cgi-bin/hi3510/ptzctrl.cgi?-step=0&-act=stop`;
  return httpGet(host, port || 80, path, username, password);
}

// ── CGI param.cgi (INSTAR / newer Hi3510 firmware, speed 1-63) ──────────────
// Documented at: wiki.instar.com/720p_Series_CGI_List/System_Menu/PTZ/
// Used by: INSTAR cameras and many rebranded Hi3510-based cameras

function sendParamCgiPtz(host, port, username, password, action, speed = 0.5) {
  const act = CGI_ACTION_MAP[action] || 'stop';
  const spd = Math.max(1, Math.min(63, Math.round(speed * 63)));
  const path = `/param.cgi?cmd=ptzctrl&-step=0&-act=${act}&-speed=${spd}`;
  return httpGet(host, port || 80, path, username, password);
}

function stopParamCgiPtz(host, port, username, password) {
  const path = `/param.cgi?cmd=ptzctrl&-step=0&-act=stop`;
  return httpGet(host, port || 80, path, username, password);
}

function goToPresetParamCgi(host, port, username, password, number) {
  const path = `/param.cgi?cmd=preset&-act=goto&-number=${number}`;
  return httpGet(host, port || 80, path, username, password);
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
 *
 * ptz_protocol values:
 *   'cgi'       — Hi3510 classic  /web/cgi-bin/hi3510/ptzctrl.cgi  speed 1-10
 *   'cgi_param' — INSTAR/param    /param.cgi?cmd=ptzctrl           speed 1-63
 *   'onvif'     — ONVIF SOAP
 *   'auto'      — tries cgi → cgi_param → onvif
 */
async function movePtz(camera, action, speed = 0.5) {
  const { resolvedHost, onvif_port, username, password } = camera;
  const port = onvif_port || 80;
  const protocol = camera.ptz_protocol || 'auto';

  if (protocol === 'onvif') return sendOnvifPtz(resolvedHost, port, username, password, action, speed);
  if (protocol === 'cgi')   return sendCgiPtz(resolvedHost, port, username, password, action, speed);
  if (protocol === 'cgi_param') return sendParamCgiPtz(resolvedHost, port, username, password, action, speed);

  // auto: cgi → cgi_param → onvif
  for (const [label, fn] of [
    ['cgi',       () => sendCgiPtz(resolvedHost, port, username, password, action, speed)],
    ['cgi_param', () => sendParamCgiPtz(resolvedHost, port, username, password, action, speed)],
    ['onvif',     () => sendOnvifPtz(resolvedHost, port, username, password, action, speed)],
  ]) {
    try {
      const result = await fn();
      console.log(`[PTZ] ${label} success for ${resolvedHost}`);
      return result;
    } catch (e) {
      console.log(`[PTZ] ${label} failed (${e.message}), trying next…`);
    }
  }
  throw new Error('Todos los protocolos PTZ fallaron');
}

async function stopPtz(camera) {
  const { resolvedHost, onvif_port, username, password } = camera;
  const port = onvif_port || 80;
  const protocol = camera.ptz_protocol || 'auto';

  if (protocol === 'onvif') return stopOnvifPtz(resolvedHost, port, username, password);
  if (protocol === 'cgi')   return stopCgiPtz(resolvedHost, port, username, password);
  if (protocol === 'cgi_param') return stopParamCgiPtz(resolvedHost, port, username, password);

  for (const [label, fn] of [
    ['cgi',       () => stopCgiPtz(resolvedHost, port, username, password)],
    ['cgi_param', () => stopParamCgiPtz(resolvedHost, port, username, password)],
    ['onvif',     () => stopOnvifPtz(resolvedHost, port, username, password)],
  ]) {
    try {
      return await fn();
    } catch (e) {
      console.log(`[PTZ] stop/${label} failed (${e.message})`);
    }
  }
}

async function goToPreset(camera, presetToken) {
  const { resolvedHost, onvif_port, username, password } = camera;
  const protocol = camera.ptz_protocol || 'auto';

  const port = onvif_port || 80;
  if (protocol === 'cgi') {
    return httpGet(resolvedHost, port, `/web/cgi-bin/hi3510/preset.cgi?-act=goto&-number=${presetToken}`, username, password);
  }
  if (protocol === 'cgi_param') {
    return goToPresetParamCgi(resolvedHost, port, username, password, presetToken);
  }
  if (protocol === 'onvif') {
    return goToPresetOnvif(resolvedHost, port, username, password, presetToken);
  }
  // auto: cgi → cgi_param → onvif
  return httpGet(resolvedHost, port, `/web/cgi-bin/hi3510/preset.cgi?-act=goto&-number=${presetToken}`, username, password)
    .catch(() => goToPresetParamCgi(resolvedHost, port, username, password, presetToken))
    .catch(() => goToPresetOnvif(resolvedHost, port, username, password, presetToken));
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
