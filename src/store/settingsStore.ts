import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type VoiceCommandSet = {
  stop: string[];
  snooze: string[];
  create: string[];
};

type SettingsStore = {
  voiceCommands: VoiceCommandSet;
  snoozeMinutes: number;
  flashEnabled: boolean;
  gradualVolume: boolean;
  autoVoice: boolean;
  highContrast: boolean;
  largeFonts: boolean;
  emergencyContact: string;
  snoozeCount: number;
  load: () => Promise<void>;
  setVoiceCommands: (commands: VoiceCommandSet) => Promise<void>;
  setSnoozeMinutes: (minutes: number) => Promise<void>;
  setFlashEnabled: (enabled: boolean) => Promise<void>;
  setGradualVolume: (enabled: boolean) => Promise<void>;
  setAutoVoice: (enabled: boolean) => Promise<void>;
  setHighContrast: (enabled: boolean) => Promise<void>;
  setLargeFonts: (enabled: boolean) => Promise<void>;
  setEmergencyContact: (phone: string) => Promise<void>;
  incrementSnooze: () => number;
  resetSnooze: () => void;
};

const DEFAULT_COMMANDS: VoiceCommandSet = {
  stop: ["parar", "desligar", "silêncio"],
  snooze: ["soneca", "adiar"],
  create: ["criar alarme", "novo alarme", "me acorda"],
};

async function saveSettings(state: any) {
  await AsyncStorage.setItem("@alert:settings", JSON.stringify({
    voiceCommands: state.voiceCommands,
    snoozeMinutes: state.snoozeMinutes,
    flashEnabled: state.flashEnabled,
    gradualVolume: state.gradualVolume,
    autoVoice: state.autoVoice,
    highContrast: state.highContrast,
    largeFonts: state.largeFonts,
    emergencyContact: state.emergencyContact,
  }));
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  voiceCommands: DEFAULT_COMMANDS,
  snoozeMinutes: 5,
  flashEnabled: true,
  gradualVolume: false,
  autoVoice: true,
  highContrast: false,
  largeFonts: false,
  emergencyContact: "",
  snoozeCount: 0,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem("@alert:settings");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.voiceCommands) {
          const vc = saved.voiceCommands;
          if (typeof vc.stop === "string") vc.stop = [vc.stop];
          if (typeof vc.snooze === "string") vc.snooze = [vc.snooze];
          if (typeof vc.create === "string") vc.create = [vc.create];
        }
        set({ ...saved, snoozeCount: 0 });
      }
    } catch (e) {
      console.warn("Erro ao carregar settings:", e);
    }
  },

  setVoiceCommands: async (commands) => {
    set({ voiceCommands: commands });
    await saveSettings({ ...get(), voiceCommands: commands });
  },
  setSnoozeMinutes: async (minutes) => {
    set({ snoozeMinutes: minutes });
    await saveSettings({ ...get(), snoozeMinutes: minutes });
  },
  setFlashEnabled: async (enabled) => {
    set({ flashEnabled: enabled });
    await saveSettings({ ...get(), flashEnabled: enabled });
  },
  setGradualVolume: async (enabled) => {
    set({ gradualVolume: enabled });
    await saveSettings({ ...get(), gradualVolume: enabled });
  },
  setAutoVoice: async (enabled) => {
    set({ autoVoice: enabled });
    await saveSettings({ ...get(), autoVoice: enabled });
  },
  setHighContrast: async (enabled) => {
    set({ highContrast: enabled });
    await saveSettings({ ...get(), highContrast: enabled });
  },
  setLargeFonts: async (enabled) => {
    set({ largeFonts: enabled });
    await saveSettings({ ...get(), largeFonts: enabled });
  },
  setEmergencyContact: async (phone) => {
    set({ emergencyContact: phone });
    await saveSettings({ ...get(), emergencyContact: phone });
  },

  incrementSnooze: () => {
    const next = get().snoozeCount + 1;
    set({ snoozeCount: next });
    return next;
  },

  resetSnooze: () => set({ snoozeCount: 0 }),
}));