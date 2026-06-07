import { create } from "zustand";
import { alarmRepository } from "../db/alarmRepository";

export type Alarm = {
  id: string;
  uid: string;
  label: string;
  hour: number;
  minute: number;
  days: number[];
  sound: string;
  active: boolean;
  created_at: number;
};

type AlarmStore = {
  alarms: Alarm[];
  ringingAlarm: Alarm | null;
  load: (uid: string) => void;
  add: (alarm: Alarm) => void;
  update: (alarm: Alarm) => void;
  remove: (id: string, uid: string) => void;
  toggle: (id: string, active: boolean, uid: string) => void;
  setRinging: (alarm: Alarm | null) => void;
};

export const useAlarmStore = create<AlarmStore>((set) => ({
  alarms: [],
  ringingAlarm: null,

  load: (uid) => {
    const alarms = alarmRepository.getAll(uid);
    set({ alarms });
  },

  add: (alarm) => {
    alarmRepository.insert(alarm);
    set((s) => ({ alarms: [...s.alarms, alarm] }));
  },

  update: (alarm) => {
    alarmRepository.update(alarm);
    set((s) => ({ alarms: s.alarms.map((a) => (a.id === alarm.id ? alarm : a)) }));
  },

  remove: (id, uid) => {
    alarmRepository.delete(id, uid);
    set((s) => ({ alarms: s.alarms.filter((a) => a.id !== id) }));
  },

  toggle: (id, active, uid) => {
    alarmRepository.toggleActive(id, active, uid);
    set((s) => ({ alarms: s.alarms.map((a) => (a.id === id ? { ...a, active } : a)) }));
  },

  setRinging: (alarm) => set({ ringingAlarm: alarm }),
}));