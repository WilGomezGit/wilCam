'use strict';
const Redis = require('ioredis');

let client = null;
let subscriber = null;

function getClient() {
  if (!client) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 3000),
      lazyConnect: true,
      enableReadyCheck: false,
    });
    client.on('error', (e) => {
      // Non-fatal: Redis unavailable means queues won't work but core API continues
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[Redis] Connection issue:', e.message);
      }
    });
    client.on('connect', () => console.log('[Redis] Connected'));
  }
  return client;
}

function getSubscriber() {
  if (!subscriber) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    subscriber = new Redis(url, { lazyConnect: true, enableReadyCheck: false });
    subscriber.on('error', () => {});
  }
  return subscriber;
}

async function connect() {
  try {
    await getClient().connect();
  } catch (e) {
    console.warn('[Redis] Could not connect:', e.message);
  }
}

async function publish(channel, data) {
  try {
    await getClient().publish(channel, JSON.stringify(data));
  } catch (_) {}
}

async function subscribe(channel, handler) {
  try {
    const sub = getSubscriber();
    await sub.connect();
    await sub.subscribe(channel);
    sub.on('message', (ch, msg) => {
      if (ch === channel) {
        try { handler(JSON.parse(msg)); } catch (_) {}
      }
    });
  } catch (e) {
    console.warn('[Redis] Subscribe failed:', e.message);
  }
}

module.exports = { getClient, connect, publish, subscribe };
