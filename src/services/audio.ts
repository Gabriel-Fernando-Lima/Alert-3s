import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useRef } from "react";

let globalStop: (() => void) | null = null;

export function getGlobalStop() { return globalStop; }
export function setGlobalStop(fn: (() => void) | null) { globalStop = fn; }

export function useAlarmAudio() {
  const player = useAudioPlayer(
    require("../../assets/sounds/alarm_default.mp3")
  );
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

export function useAlarmRinging() {
  const player = useAudioPlayer(
    require("../../assets/sounds/alarm_default.mp3")
  );
  const gradualRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRinging(gradualVolume = false) {
    try {
      console.log("🔊 startRinging chamado, gradualVolume:", gradualVolume);
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionModeAndroid: "doNotMix",
        shouldPlayInBackground: true,
      });

      player.seekTo(0);
      player.loop = true;

      if (gradualVolume) {
        console.log("🔊 Modo gradual ativado — começando no volume 0");
        player.volume = 0;
        player.play();
        let vol = 0;
        gradualRef.current = setInterval(() => {
          try {
            vol = Math.min(1, vol + 0.033);
            player.volume = vol;
            console.log(`🔊 Volume: ${(vol * 100).toFixed(0)}%`);
            if (vol >= 1 && gradualRef.current) {
              clearInterval(gradualRef.current);
              gradualRef.current = null;
              console.log("🔊 Volume máximo atingido");
            }
          } catch (e) {
            console.warn("🔊 Erro ao ajustar volume:", e);
          }
        }, 1000);
      } else {
        console.log("🔊 Volume normal — 100%");
        player.volume = 1;
        player.play();
      }

      setGlobalStop(() => stopRinging);
    } catch (e) {
      console.warn("🔊 Erro ao iniciar alarme:", e);
    }
  }

  function stopRinging() {
    try {
      console.log("🔊 stopRinging chamado");
      if (gradualRef.current) {
        clearInterval(gradualRef.current);
        gradualRef.current = null;
      }
      player.loop = false;
      player.volume = 1;
      player.pause();
      setGlobalStop(null);
    } catch (e) {}
  }

  return { startRinging, stopRinging };
}