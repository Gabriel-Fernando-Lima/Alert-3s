import { useState, useCallback, useRef } from "react";
import * as IntentLauncher from "expo-intent-launcher";
import { parseVoiceCommand } from "@/src/utils/nlp";
import { useSettingsStore } from "@/src/store/settingsStore";

type UseVoiceCommandOptions = {
  onStop?: () => void;
  onSnooze?: () => void;
  onCreateAlarm?: (hour: number, minute: number, days: number[], label: string) => void;
  onNap?: (minutes: number) => void;
  continuous?: boolean;
  onBeforeListen?: () => void;
  onAfterListen?: () => void;
  prompt?: string; // ← adiciona isso
};

export function useVoiceCommand(options: UseVoiceCommandOptions = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const continuousRef = useRef(false);
  const stoppedRef = useRef(false);

  const startListening = useCallback(async () => {
    try {
      setListening(true);
      setTranscript("");
      setError(null);
      stoppedRef.current = false;

      await listenOnce();
    } catch (e: any) {
      setError(e.message);
      setListening(false);
    }
  }, [options.onStop, options.onSnooze, options.onCreateAlarm, options.onNap, options.continuous]);

  async function listenOnce() {
    try {
      options.onBeforeListen?.();

      const result = await IntentLauncher.startActivityAsync(
        "android.speech.action.RECOGNIZE_SPEECH",
        {
          extra: {
            "android.speech.extra.LANGUAGE_MODEL": "free_form",
            "android.speech.extra.LANGUAGE": "pt-BR",
            "android.speech.extra.PROMPT": options.prompt ?? "Diga o comando...",
            "android.speech.extra.MAX_RESULTS": 1,
          },
        }
      );
      options.onAfterListen?.();

      if (stoppedRef.current) return;

      if (result.resultCode === -1 || result.resultCode === 1) {
        const extra = result.extra as any;
        const text = extra?.["android.speech.extra.RESULTS"]?.[0] ?? extra?.query ?? "";

        if (text) {
          setTranscript(text);
          const handled = handleCommand(text);
          if (!handled && options.continuous && !stoppedRef.current) {
            setTimeout(() => listenOnce(), 3000); // ← aqui
          } else {
            setListening(false);
          }
        } else if (options.continuous && !stoppedRef.current) {
          setTimeout(() => listenOnce(), 3000); // ← aqui
        } else {
          setListening(false);
        }
      } else if (options.continuous && !stoppedRef.current) {
        setTimeout(() => listenOnce(), 3000); // ← aqui
      } else {
        setListening(false);
      }
    } catch (e: any) {
      if (options.continuous && !stoppedRef.current) {
        setTimeout(() => listenOnce(), 3000); // ← aqui
      } else {
        setListening(false);
      }
    }
  }

  function handleCommand(text: string): boolean {
    const { voiceCommands } = useSettingsStore.getState();
    const lower = text.toLowerCase().trim();

    if (voiceCommands.stop.some((cmd) => lower.includes(cmd.toLowerCase()))) {
      stoppedRef.current = true;
      setListening(false);
      options.onStop?.();
      return true;
    }

    if (voiceCommands.snooze.some((cmd) => lower.includes(cmd.toLowerCase()))) {
      stoppedRef.current = true;
      setListening(false);
      options.onSnooze?.();
      return true;
    }

    if (voiceCommands.create.some((cmd) => lower.includes(cmd.toLowerCase()))) {
      const result = parseVoiceCommand(text);
      if (result.type === "create" && result.alarm) {
        options.onCreateAlarm?.(result.alarm.hour, result.alarm.minute, result.alarm.days, result.alarm.label);
        return true;
      }
    }

    const result = parseVoiceCommand(text);
    switch (result.type) {
      case "stop":
        stoppedRef.current = true;
        setListening(false);
        options.onStop?.();
        return true;
      case "snooze":
        stoppedRef.current = true;
        setListening(false);
        options.onSnooze?.();
        return true;
      case "nap":
        stoppedRef.current = true;
        setListening(false);
        options.onNap?.(result.napMinutes ?? 20);
        return true;
      case "create":
        if (result.alarm) {
          options.onCreateAlarm?.(result.alarm.hour, result.alarm.minute, result.alarm.days, result.alarm.label);
          return true;
        }
        return false;
      default:
        return false;
    }
  }

  const stopListening = useCallback(() => {
    stoppedRef.current = true;
    setListening(false);
  }, []);

  return { listening, transcript, error, startListening, stopListening };
}