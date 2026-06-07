import db from "./schema";
import { Alarm } from "../store/alarmStore";

export type AlarmHistory = {
  id: string;
  uid: string;
  alarm_id: string;
  label: string;
  hour: number;
  minute: number;
  fired_at: number;
  stopped_at: number | null;
  method: "touch" | "voice" | "shake" | "snooze";
};

export const alarmRepository = {
  getAll(uid: string): Alarm[] {
    const raw = db.getAllSync(
      "SELECT * FROM alarms WHERE uid=? ORDER BY hour ASC, minute ASC",
      [uid]
    ) as any[];
    return raw.map((a) => ({
      ...a,
      active: a.active === 1,
      days: typeof a.days === "string" ? JSON.parse(a.days) : a.days,
    }));
  },

  insert(alarm: Alarm) {
    db.runSync(
      `INSERT INTO alarms (id, uid, label, hour, minute, days, sound, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [alarm.id, alarm.uid, alarm.label, alarm.hour, alarm.minute,
       JSON.stringify(alarm.days), alarm.sound, alarm.active ? 1 : 0, alarm.created_at]
    );
  },

  update(alarm: Alarm) {
    db.runSync(
      `UPDATE alarms SET label=?, hour=?, minute=?, days=?, sound=?, active=? WHERE id=? AND uid=?`,
      [alarm.label, alarm.hour, alarm.minute, JSON.stringify(alarm.days),
       alarm.sound, alarm.active ? 1 : 0, alarm.id, alarm.uid]
    );
  },

  delete(id: string, uid: string) {
    db.runSync("DELETE FROM alarms WHERE id=? AND uid=?", [id, uid]);
  },

  toggleActive(id: string, active: boolean, uid: string) {
    db.runSync("UPDATE alarms SET active=? WHERE id=? AND uid=?", [active ? 1 : 0, id, uid]);
  },

  // Histórico
  insertHistory(h: AlarmHistory) {
    db.runSync(
      `INSERT INTO alarm_history (id, uid, alarm_id, label, hour, minute, fired_at, stopped_at, method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [h.id, h.uid, h.alarm_id, h.label, h.hour, h.minute,
       h.fired_at, h.stopped_at ?? null, h.method]
    );
  },

  getHistory(uid: string, limit = 50): AlarmHistory[] {
    return db.getAllSync(
      "SELECT * FROM alarm_history WHERE uid=? ORDER BY fired_at DESC LIMIT ?",
      [uid, limit]
    ) as AlarmHistory[];
  },

  getHistoryLast7Days(uid: string): AlarmHistory[] {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return db.getAllSync(
      "SELECT * FROM alarm_history WHERE uid=? AND fired_at >= ? ORDER BY fired_at ASC",
      [uid, since]
    ) as AlarmHistory[];
  },
};