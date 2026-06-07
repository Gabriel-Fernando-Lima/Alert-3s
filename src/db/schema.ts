import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("alert.db");

export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY NOT NULL,
      uid TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      days TEXT NOT NULL DEFAULT '[]',
      sound TEXT NOT NULL DEFAULT 'default',
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alarm_history (
      id TEXT PRIMARY KEY NOT NULL,
      uid TEXT NOT NULL,
      alarm_id TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      fired_at INTEGER NOT NULL,
      stopped_at INTEGER,
      method TEXT NOT NULL DEFAULT 'touch'
    );
  `);
}

export default db;