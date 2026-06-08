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
  shakeEnabled: boolean;
  setShakeEnabled: (enabled: boolean) => Promise<void>;
  voiceLanguage: "pt-BR" | "en-US" | "es-ES";
  voiceStats: { recognized: number; failed: number };
  setVoiceLanguage: (lang: "pt-BR" | "en-US" | "es-ES") => Promise<void>;
  incrementVoiceStat: (type: "recognized" | "failed") => void;
  resetVoiceStats: () => void;
  challengeEnabled: boolean;
  setChallengeEnabled: (enabled: boolean) => Promise<void>;
  brightnessRamp: boolean;
  motivationalEnabled: boolean;
  setBrightnessRamp: (enabled: boolean) => Promise<void>;
  setMotivationalEnabled: (enabled: boolean) => Promise<void>;
  tutorialSeen: boolean;
  vibrationPattern: "default" | "long" | "short" | "none";
  setTutorialSeen: (seen: boolean) => Promise<void>;
  setVibrationPattern: (pattern: "default" | "long" | "short" | "none") => Promise<void>;

};

const DEFAULT_COMMANDS: VoiceCommandSet = {
  stop: ["parar", "desligar", "silêncio"],
  snooze: ["soneca", "adiar"],
  create: ["criar alarme", "novo alarme", "me acorda"],
};

async function saveSettings(state: any) {
  try {
    const payload = {
      voiceCommands: state.voiceCommands,
      snoozeMinutes: state.snoozeMinutes,
      flashEnabled: state.flashEnabled,
      gradualVolume: state.gradualVolume,
      autoVoice: state.autoVoice,
      highContrast: state.highContrast,
      largeFonts: state.largeFonts,
      emergencyContact: state.emergencyContact,
      shakeEnabled: state.shakeEnabled,
      voiceLanguage: state.voiceLanguage,
      voiceStats: state.voiceStats,
      challengeEnabled: state.challengeEnabled,
      brightnessRamp: state.brightnessRamp,
      motivationalEnabled: state.motivationalEnabled,
      tutorialSeen: state.tutorialSeen,
      vibrationPattern: state.vibrationPattern,
    };
    console.log("[settingsStore.saveSettings] saving:", payload);
    await AsyncStorage.setItem("@alert:settings", JSON.stringify(payload));
  } catch (e) {
    console.warn("[settingsStore.saveSettings] error saving settings:", e);
  }
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
  shakeEnabled: true,
  voiceLanguage: "pt-BR",
  voiceStats: { recognized: 0, failed: 0 },
  challengeEnabled: false,
  brightnessRamp: true,
  motivationalEnabled: true,
  tutorialSeen: false,
  vibrationPattern: "default",

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem("@alert:settings");
      if (raw) {
        const saved = JSON.parse(raw);
        console.log("[settingsStore.load] loaded from storage:", saved);
        if (saved.voiceCommands) {
          const vc = saved.voiceCommands;
          if (typeof vc.stop === "string") vc.stop = [vc.stop];
          if (typeof vc.snooze === "string") vc.snooze = [vc.snooze];
          if (typeof vc.create === "string") vc.create = [vc.create];
        }
        if (saved.voiceStats) console.log("[settingsStore.load] saved.voiceStats:", saved.voiceStats);
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
  setShakeEnabled: async (enabled) => {
    set({ shakeEnabled: enabled });
    await saveSettings({ ...get(), shakeEnabled: enabled });
  },
  setVoiceLanguage: async (lang) => {
    set({ voiceLanguage: lang });
    await saveSettings({ ...get(), voiceLanguage: lang });
  },
  incrementVoiceStat: (type) => {
    const stats = get().voiceStats;
    const next = { ...stats, [type]: stats[type] + 1 };
    console.log(`[settingsStore.incrementVoiceStat] ${type} from ${stats[type]} -> ${next[type]}`, { prev: stats, next });
    set({ voiceStats: next });
    // persist updated stats
    try {
      saveSettings({ ...get(), voiceStats: next });
    } catch (e) {
      console.warn("[settingsStore.incrementVoiceStat] failed to persist voiceStats:", e);
    }
  },
  resetVoiceStats: () => {
    const next = { recognized: 0, failed: 0 };
    set({ voiceStats: next });
    try {
      saveSettings({ ...get(), voiceStats: next });
    } catch (e) {
      console.warn("[settingsStore.resetVoiceStats] failed to persist voiceStats:", e);
    }
  },
  setChallengeEnabled: async (enabled) => {
    set({ challengeEnabled: enabled });
    await saveSettings({ ...get(), challengeEnabled: enabled });
  },
  setBrightnessRamp: async (enabled) => {
    set({ brightnessRamp: enabled });
    await saveSettings({ ...get(), brightnessRamp: enabled });
  },
  setMotivationalEnabled: async (enabled) => {
    set({ motivationalEnabled: enabled });
    await saveSettings({ ...get(), motivationalEnabled: enabled });
  },
  setTutorialSeen: async (seen) => {
    set({ tutorialSeen: seen });
    await saveSettings({ ...get(), tutorialSeen: seen });
  },
  setVibrationPattern: async (pattern) => {
    set({ vibrationPattern: pattern });
    await saveSettings({ ...get(), vibrationPattern: pattern });
  },
  incrementSnooze: () => {
    const next = get().snoozeCount + 1;
    set({ snoozeCount: next });
    return next;
  },

  resetSnooze: () => set({ snoozeCount: 0 }),
}));