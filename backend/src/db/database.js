'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './wilcam.db';
const db = new Database(path.resolve(DB_PATH));

// WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -8000');
db.pragma('temp_store = MEMORY');

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'operator' CHECK(role IN ('admin','operator','viewer')),
      password_hash TEXT NOT NULL,
      refresh_token TEXT,
      last_login  TEXT,
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cameras (
      id                 TEXT PRIMARY KEY,
      name               TEXT NOT NULL,
      location           TEXT NOT NULL DEFAULT '',
      group_name         TEXT NOT NULL DEFAULT 'default',
      rtsp_url           TEXT NOT NULL,
      onvif_host         TEXT,
      onvif_port         INTEGER DEFAULT 80,
      username           TEXT DEFAULT '',
      password           TEXT DEFAULT '',
      resolution         TEXT DEFAULT 'HD',
      fps                INTEGER DEFAULT 15,
      codec              TEXT DEFAULT 'h264',
      recording_enabled  INTEGER NOT NULL DEFAULT 1,
      ai_enabled         INTEGER NOT NULL DEFAULT 0,
      ptz_enabled        INTEGER NOT NULL DEFAULT 0,
      status             TEXT NOT NULL DEFAULT 'offline' CHECK(status IN ('online','offline','recording','error')),
      sort_order         INTEGER DEFAULT 0,
      created_at         TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recordings (
      id               TEXT PRIMARY KEY,
      camera_id        TEXT NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
      filename         TEXT NOT NULL,
      filepath         TEXT NOT NULL,
      start_time       TEXT NOT NULL,
      end_time         TEXT,
      duration_seconds INTEGER,
      size_bytes       INTEGER,
      has_motion       INTEGER NOT NULL DEFAULT 0,
      cloud_uploaded   INTEGER NOT NULL DEFAULT 0,
      cloud_url        TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id            TEXT PRIMARY KEY,
      camera_id     TEXT NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
      event_type    TEXT NOT NULL,
      confidence    REAL,
      snapshot_path TEXT,
      clip_path     TEXT,
      metadata      TEXT DEFAULT '{}',
      reviewed      INTEGER NOT NULL DEFAULT 0,
      false_positive INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cloud_uploads (
      id           TEXT PRIMARY KEY,
      recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
      camera_id    TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','uploading','done','failed')),
      retry_count  INTEGER NOT NULL DEFAULT 0,
      file_size    INTEGER,
      cloud_path   TEXT,
      error_msg    TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras(status);
    CREATE INDEX IF NOT EXISTS idx_recordings_camera ON recordings(camera_id);
    CREATE INDEX IF NOT EXISTS idx_recordings_start ON recordings(start_time);
    CREATE INDEX IF NOT EXISTS idx_recordings_cloud ON recordings(cloud_uploaded);
    CREATE INDEX IF NOT EXISTS idx_events_camera ON events(camera_id);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_reviewed ON events(reviewed);
    CREATE INDEX IF NOT EXISTS idx_cloud_uploads_status ON cloud_uploads(status);
  `);

  // Seed default admin user if none exists
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const { v4: uuidv4 } = require('uuid');
    const hash = bcrypt.hashSync('admin123', parseInt(process.env.BCRYPT_ROUNDS || '10'));
    db.prepare(`
      INSERT INTO users (id, email, name, role, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'admin@wilcam.local', 'Administrador', 'admin', hash);
    console.log('[DB] Usuario admin creado: admin@wilcam.local / admin123');
  }

  // Seed demo cameras if none exist
  const cameraCount = db.prepare('SELECT COUNT(*) as c FROM cameras').get().c;
  if (cameraCount === 0) {
    const { v4: uuidv4 } = require('uuid');
    const insert = db.prepare(`
      INSERT INTO cameras (id, name, location, group_name, rtsp_url, onvif_host, onvif_port, username, password, resolution, fps, ptz_enabled, ai_enabled, recording_enabled, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const cameras = [
      ['Estacionamiento Norte', 'Exterior · Planta Baja', 'exterior', 'rtsp://admin:admin@192.168.1.41:554/stream', '192.168.1.41', 80, 'admin', 'admin', '4K', 30, 1, 1, 1, 'offline', 0],
      ['Lobby Principal', 'Edificio B · Planta Baja', 'interior', 'rtsp://admin:admin@192.168.1.42:554/stream', '192.168.1.42', 80, 'admin', 'admin', '4K', 30, 0, 1, 1, 'offline', 1],
      ['Oficinas Piso 2', 'Edificio A · Piso 2', 'interior', 'rtsp://admin:admin@192.168.1.43:554/stream', '192.168.1.43', 80, 'admin', 'admin', 'HD', 15, 0, 0, 1, 'offline', 2],
      ['Almacén A', 'Almacén C · Planta Baja', 'interior', 'rtsp://admin:admin@192.168.1.44:554/stream', '192.168.1.44', 80, 'admin', 'admin', '4K', 25, 1, 1, 1, 'offline', 3],
      ['Calle Frontal', 'Exterior · Acceso Principal', 'exterior', 'rtsp://admin:admin@192.168.1.45:554/stream', '192.168.1.45', 80, 'admin', 'admin', '4K', 30, 0, 1, 1, 'offline', 4],
      ['Pasillo Sur', 'Edificio A · Piso 1', 'interior', 'rtsp://admin:admin@192.168.1.46:554/stream', '192.168.1.46', 80, 'admin', 'admin', 'HD', 15, 0, 0, 1, 'offline', 5],
      ['Recepción', 'Edificio B · Planta Baja', 'interior', 'rtsp://admin:admin@192.168.1.47:554/stream', '192.168.1.47', 80, 'admin', 'admin', '4K', 30, 1, 1, 1, 'offline', 6],
      ['Carga y Descarga', 'Almacén C · Exterior', 'exterior', 'rtsp://admin:admin@192.168.1.48:554/stream', '192.168.1.48', 80, 'admin', 'admin', '4K', 25, 1, 1, 1, 'offline', 7],
      ['Azotea', 'Edificio A · Azotea', 'exterior', 'rtsp://admin:admin@192.168.1.49:554/stream', '192.168.1.49', 80, 'admin', 'admin', 'HD', 15, 0, 0, 0, 'offline', 8],
    ];
    cameras.forEach(([name, location, group_name, rtsp_url, onvif_host, onvif_port, username, password, resolution, fps, ptz_enabled, ai_enabled, recording_enabled, status, sort_order]) => {
      insert.run(uuidv4(), name, location, group_name, rtsp_url, onvif_host, onvif_port, username, password, resolution, fps, ptz_enabled, ai_enabled, recording_enabled, status, sort_order);
    });
    console.log('[DB] 9 cámaras demo creadas');
  }
}

init();

module.exports = db;
