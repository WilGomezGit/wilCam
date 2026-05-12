const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './wilcam.db';
let db;

function getDb() {
  if (!db) {
    db = new Database(path.resolve(DB_PATH));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      group_name TEXT DEFAULT 'default',
      rtsp_url TEXT NOT NULL,
      onvif_host TEXT,
      onvif_port INTEGER DEFAULT 80,
      username TEXT,
      password TEXT,
      resolution TEXT DEFAULT '1920x1080',
      fps INTEGER DEFAULT 25,
      codec TEXT DEFAULT 'H.265',
      recording_enabled INTEGER DEFAULT 1,
      ai_enabled INTEGER DEFAULT 1,
      ptz_enabled INTEGER DEFAULT 0,
      status TEXT DEFAULT 'offline',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      camera_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      duration_seconds INTEGER,
      size_bytes INTEGER,
      has_motion INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      camera_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      confidence REAL,
      snapshot_path TEXT,
      clip_path TEXT,
      metadata TEXT,
      reviewed INTEGER DEFAULT 0,
      false_positive INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'operator',
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_recordings_camera ON recordings(camera_id);
    CREATE INDEX IF NOT EXISTS idx_recordings_start ON recordings(start_time);
    CREATE INDEX IF NOT EXISTS idx_events_camera ON events(camera_id);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
  `);

  // Seed demo cameras if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM cameras').get();
  if (count.c === 0) {
    const insert = db.prepare(`
      INSERT INTO cameras (id, name, location, group_name, rtsp_url, resolution, ptz_enabled, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const cams = [
      ['cam-01', 'Estacionamiento Norte', 'Av. Larco 1132 · Lote A', 'exterior', 'rtsp://admin:admin@192.168.1.41:554/stream1', '3840x2160', 0, 'online'],
      ['cam-02', 'Lobby Principal', 'Edificio B · Planta 1', 'interior', 'rtsp://admin:admin@192.168.1.42:554/stream1', '3840x2160', 1, 'online'],
      ['cam-03', 'Oficinas P2', 'Ala Este', 'interior', 'rtsp://admin:admin@192.168.1.43:554/stream1', '1920x1080', 0, 'online'],
      ['cam-04', 'Almacén A', 'Edificio C', 'interior', 'rtsp://admin:admin@192.168.1.44:554/stream1', '3840x2160', 0, 'online'],
      ['cam-05', 'Calle Frontal', 'Vía pública', 'exterior', 'rtsp://admin:admin@192.168.1.45:554/stream1', '3840x2160', 1, 'online'],
      ['cam-06', 'Pasillo Sur', 'Edificio B · P2', 'interior', 'rtsp://admin:admin@192.168.1.46:554/stream1', '1920x1080', 0, 'online'],
      ['cam-07', 'Recepción', 'Edificio B · P1', 'interior', 'rtsp://admin:admin@192.168.1.47:554/stream1', '3840x2160', 0, 'online'],
      ['cam-08', 'Carga y Descarga', 'Edificio C · Norte', 'exterior', 'rtsp://admin:admin@192.168.1.48:554/stream1', '3840x2160', 0, 'online'],
      ['cam-09', 'Azotea', 'Edificio A · Techo', 'exterior', 'rtsp://admin:admin@192.168.1.49:554/stream1', '1920x1080', 0, 'offline'],
    ];
    const insertAll = db.transaction(() => cams.forEach(c => insert.run(...c)));
    insertAll();
  }
}

module.exports = { getDb };
