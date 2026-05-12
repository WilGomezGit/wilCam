/**
 * ONVIF Service — camera discovery, profiles, stream URI
 * Uses raw SOAP over HTTP for broad compatibility.
 */

const dgram = require('dgram');
const http = require('http');

const WS_DISCOVERY_MSG = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
            xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <s:Header>
    <a:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>
    <a:MessageID>uuid:${randomUuid()}</a:MessageID>
    <a:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</a:To>
  </s:Header>
  <s:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </s:Body>
</s:Envelope>`;

function randomUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/**
 * Discover ONVIF cameras on the local network via WS-Discovery.
 * Returns array of { xaddrs, types } within timeoutMs.
 */
function discoverCameras(timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const found = [];
    const seenXaddrs = new Set();

    socket.on('message', (msg) => {
      const body = msg.toString('utf8');
      const xaddrMatch = body.match(/<[^:]*XAddrs[^>]*>([^<]+)<\/[^:]*XAddrs>/);
      if (xaddrMatch) {
        const xaddrs = xaddrMatch[1].trim().split(/\s+/);
        const key = xaddrs[0];
        if (!seenXaddrs.has(key)) {
          seenXaddrs.add(key);
          found.push({ xaddrs, raw: body });
        }
      }
    });

    socket.on('error', () => {});

    socket.bind(() => {
      const msg = Buffer.from(WS_DISCOVERY_MSG, 'utf8');
      socket.send(msg, 0, msg.length, 3702, '239.255.255.250', () => {});
    });

    setTimeout(() => {
      socket.close();
      resolve(found);
    }, timeoutMs);
  });
}

/**
 * Get stream URI for a camera profile.
 */
function getStreamUri(host, port, username, password, profileToken = 'MainStreamProfileToken') {
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
            xmlns:tt="http://www.onvif.org/ver10/schema">
  <s:Header>${authHeader(username, password)}</s:Header>
  <s:Body>
    <trt:GetStreamUri>
      <trt:StreamSetup>
        <tt:Stream>RTP-Unicast</tt:Stream>
        <tt:Transport><tt:Protocol>RTSP</tt:Protocol></tt:Transport>
      </trt:StreamSetup>
      <trt:ProfileToken>${profileToken}</trt:ProfileToken>
    </trt:GetStreamUri>
  </s:Body>
</s:Envelope>`;

  return postOnvif(host, port, '/onvif/media', soap).then(({ body }) => {
    const m = body.match(/<[^:]*Uri[^>]*>([^<]+)<\/[^:]*Uri>/);
    return m ? m[1].trim() : null;
  });
}

/**
 * Get device information.
 */
function getDeviceInfo(host, port, username, password) {
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:tds="http://www.onvif.org/ver10/device/wsdl">
  <s:Header>${authHeader(username, password)}</s:Header>
  <s:Body><tds:GetDeviceInformation/></s:Body>
</s:Envelope>`;

  return postOnvif(host, port, '/onvif/device_service', soap).then(({ body }) => {
    const extract = (tag) => { const m = body.match(new RegExp(`<[^:]*${tag}[^>]*>([^<]+)<\/[^:]*${tag}>`)); return m ? m[1] : ''; };
    return {
      manufacturer: extract('Manufacturer'),
      model: extract('Model'),
      firmwareVersion: extract('FirmwareVersion'),
      serialNumber: extract('SerialNumber'),
    };
  });
}

function authHeader(username, password) {
  if (!username) return '';
  return `<Security xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
    <UsernameToken>
      <Username>${username}</Username>
      <Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password || ''}</Password>
    </UsernameToken>
  </Security>`;
}

function postOnvif(host, port, path, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(body, 'utf8');
    const req = http.request({
      hostname: host, port: port || 80, path, method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8', 'Content-Length': data.length },
      timeout: 5000,
    }, (res) => {
      let b = '';
      res.on('data', c => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('ONVIF timeout')); });
    req.write(data);
    req.end();
  });
}

module.exports = { discoverCameras, getStreamUri, getDeviceInfo };
