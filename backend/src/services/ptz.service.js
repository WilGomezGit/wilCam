/**
 * PTZ Service — ONVIF PTZ control
 * Falls back to HTTP CGI for non-ONVIF cameras.
 */

const http = require('http');

// Active PTZ sessions (stops movement after timeout)
const movementTimers = new Map();

/**
 * Send an ONVIF PTZ move command via HTTP SOAP.
 * This is a lightweight implementation that sends raw SOAP to ONVIF cameras.
 */
async function sendOnvifPtz(host, port, username, password, action, speed = 0.5) {
  const { x, y, zoom } = resolveVelocity(action, speed);

  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl"
            xmlns:tt="http://www.onvif.org/ver10/schema">
  <s:Header>
    <Security xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <UsernameToken>
        <Username>${username}</Username>
        <Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</Password>
      </UsernameToken>
    </Security>
  </s:Header>
  <s:Body>
    <tptz:ContinuousMove>
      <tptz:ProfileToken>MainStreamProfileToken</tptz:ProfileToken>
      <tptz:Velocity>
        <tt:PanTilt x="${x}" y="${y}"/>
        <tt:Zoom x="${zoom}"/>
      </tptz:Velocity>
    </tptz:ContinuousMove>
  </s:Body>
</s:Envelope>`;

  return postSoap(host, port, '/onvif/PTZ', soap);
}

async function stopOnvifPtz(host, port, username, password) {
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl">
  <s:Header>
    <Security xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <UsernameToken>
        <Username>${username}</Username>
        <Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</Password>
      </UsernameToken>
    </Security>
  </s:Header>
  <s:Body>
    <tptz:Stop>
      <tptz:ProfileToken>MainStreamProfileToken</tptz:ProfileToken>
      <tptz:PanTilt>true</tptz:PanTilt>
      <tptz:Zoom>true</tptz:Zoom>
    </tptz:Stop>
  </s:Body>
</s:Envelope>`;

  return postSoap(host, port, '/onvif/PTZ', soap);
}

async function goToPreset(host, port, username, password, presetToken) {
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl"
            xmlns:tt="http://www.onvif.org/ver10/schema">
  <s:Header>
    <Security xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <UsernameToken>
        <Username>${username}</Username>
        <Password>${password}</Password>
      </UsernameToken>
    </Security>
  </s:Header>
  <s:Body>
    <tptz:GotoPreset>
      <tptz:ProfileToken>MainStreamProfileToken</tptz:ProfileToken>
      <tptz:PresetToken>${presetToken}</tptz:PresetToken>
    </tptz:GotoPreset>
  </s:Body>
</s:Envelope>`;

  return postSoap(host, port, '/onvif/PTZ', soap);
}

function resolveVelocity(action, speed) {
  const s = Math.min(1, Math.max(0, speed));
  const map = {
    up:         { x: 0,  y: s,  zoom: 0 },
    down:       { x: 0,  y: -s, zoom: 0 },
    left:       { x: -s, y: 0,  zoom: 0 },
    right:      { x: s,  y: 0,  zoom: 0 },
    'up-left':  { x: -s, y: s,  zoom: 0 },
    'up-right': { x: s,  y: s,  zoom: 0 },
    'down-left':{ x: -s, y: -s, zoom: 0 },
    'down-right':{ x: s, y: -s, zoom: 0 },
    'zoom-in':  { x: 0,  y: 0,  zoom: s },
    'zoom-out': { x: 0,  y: 0,  zoom: -s },
    stop:       { x: 0,  y: 0,  zoom: 0 },
  };
  return map[action] || { x: 0, y: 0, zoom: 0 };
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
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'Content-Length': data.length,
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('ONVIF timeout')); });
    req.write(data);
    req.end();
  });
}

// Auto-stop movement after maxMs (safety)
function schedulePtzStop(cameraId, host, port, username, password, maxMs = 3000) {
  if (movementTimers.has(cameraId)) {
    clearTimeout(movementTimers.get(cameraId));
  }
  const timer = setTimeout(() => {
    stopOnvifPtz(host, port, username, password).catch(() => {});
    movementTimers.delete(cameraId);
  }, maxMs);
  movementTimers.set(cameraId, timer);
}

module.exports = {
  sendOnvifPtz,
  stopOnvifPtz,
  goToPreset,
  schedulePtzStop,
};
