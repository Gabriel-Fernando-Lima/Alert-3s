import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useRef } from "react";

// Mapa de sons disponíveis
export const ALARM_SOUNDS: Record<string, any> = {
  default: require("../../assets/sounds/alarm_default.mp3"),
  beep: require("../../assets/sounds/alarm_default.mp3"),     // substitui pelo arquivo real quando tiver
  digital: require("../../assets/sounds/alarm_default.mp3"),  // substitui pelo arquivo real quando tiver
  nature: require("../../assets/sounds/alarm_default.mp3"),   // substitui pelo arquivo real quando tiver
};

let globalStop: (() => void) | null = null;
export function getGlobalStop() { return globalStop; }
export function setGlobalStop(fn: (() => void) | null) { globalStop = fn; }

export function useAlarmAudio(sound = "default") {
  const source = ALARM_SOUNDS[sound] ?? ALARM_SOUNDS.default;
  const player = useAudioPlayer(source);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function playPreview() {
    try {
      if (timerRef.current) clearTimeout(timerRef.current);
      player.seekTo(0);
      player.play();
      timerRef.current = setTimeout(() => {
        try { player.pause(); } catch (e) { }
      }, 3000);
    } catch (e) {
      console.warn("Erro ao tocar som:", e);
    }
  }

  return { playPreview };
}

export function useAlarmRinging(sound = "default") {
  const source = ALARM_SOUNDS[sound] ?? ALARM_SOUNDS.default;
  const player = useAudioPlayer(source);
  const gradualRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRinging(gradualVolume = false) {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionModeAndroid: "doNotMix",
        shouldPlayInBackground: true,
      });
      player.seekTo(0);
      player.loop = true;

      if (gradualVolume) {
        player.volume = 0;
        player.play();
        let vol = 0;
        gradualRef.current = setInterval(() => {
          try {
            vol = Math.min(1, vol + 0.033);
            player.volume = vol;
            if (vol >= 1 && gradualRef.current) {
              clearInterval(gradualRef.current);
              gradualRef.current = null;
            }
          } catch (e) {}
        }, 1000);
      } else {
        player.volume = 1;
        player.play();
      }
      setGlobalStop(() => stopRinging);
    } catch (e) {
      console.warn("Erro ao iniciar alarme:", e);
    }
  }

  function stopRinging() {
    try {
      if (gradualRef.current) { clearInterval(gradualRef.current); gradualRef.current = null; }
      player.loop = false;
      player.volume = 1;
      player.pause();
      setGlobalStop(null);
    } catch (e) {}
  }

  return { startRinging, stopRinging };
}