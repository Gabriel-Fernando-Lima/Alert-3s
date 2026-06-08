import { useState, useCallback, useRef } from "react";
import * as IntentLauncher from "expo-intent-launcher";
import { parseVoiceCommand } from "@/src/utils/nlp";
import { useSettingsStore } from "@/src/store/settingsStore";

type UseVoiceCommandOptions = {
  onStop?: () => void;
  onSnooze?: () => void;
  onCreateAlarm?: (hour: number, minute: number, days: number[], label: string) => void;
  onNap?: (minutes: number) => void;
  onReminder?: (hour: number, minute: number, label: string) => void;
  continuous?: boolean;
  onBeforeListen?: () => void;
  onAfterListen?: () => void;
  prompt?: string;
};

export function useVoiceCommand(options: UseVoiceCommandOptions = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const stoppedRef = useRef(false);
  const { voiceLanguage, voiceCommands, incrementVoiceStat } = useSettingsStore.getState();
  


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
  }, [options.onStop, options.onSnooze, options.onCreateAlarm, options.onNap, options.onReminder, options.continuous]);

  async function listenOnce() {
    try {
      options.onBeforeListen?.();

      const result = await IntentLauncher.startActivityAsync(
        "android.speech.action.RECOGNIZE_SPEECH",
        {
          extra: {
            "android.speech.extra.LANGUAGE_MODEL": "free_form",
            "android.speech.extra.LANGUAGE": voiceLanguage,
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
          console.log("[useVoiceCommand] recognized text:", text, "handled:", handled, "lang:", voiceLanguage);
          if (handled) {
            incrementVoiceStat("recognized");
            if (!options.continuous && !stoppedRef.current) setListening(false);
          } else {
            incrementVoiceStat("failed");
            if (options.continuous && !stoppedRef.current) {
              setTimeout(() => listenOnce(), 3000);
            } else {
              setListening(false);
            }
          }
        } else {
          // Nenhum texto reconhecido
          incrementVoiceStat("failed");
          if (options.continuous && !stoppedRef.current) {
            setTimeout(() => listenOnce(), 3000);
          } else {
            setListening(false);
          }
        }
        
      } else if (options.continuous && !stoppedRef.current) {
        setTimeout(() => listenOnce(), 3000);
      } else {
        setListening(false);
      }
    } catch (e: any) {
      incrementVoiceStat("failed");
      options.onAfterListen?.();
      if (options.continuous && !stoppedRef.current) {
        setTimeout(() => listenOnce(), 3000);
      } else {
        setListening(false);
      }
    }
  }

  function handleCommand(text: string): boolean {
    const { voiceCommands } = useSettingsStore.getState();
    const lower = text.toLowerCase().trim();

    // Comandos personalizados
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
      const result = parseVoiceCommand(text, voiceLanguage);
      if (result.type === "create" && result.alarm) {
        options.onCreateAlarm?.(result.alarm.hour, result.alarm.minute, result.alarm.days, result.alarm.label);
        return true;
      }
    }

    const result = parseVoiceCommand(text, voiceLanguage);
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
      case "reminder":
        if (result.reminder) {
          stoppedRef.current = true;
          setListening(false);
          options.onReminder?.(result.reminder.hour, result.reminder.minute, result.reminder.label);
          return true;
        }
        return false;
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