import { View, TouchableOpacity, StyleSheet, Vibration } from "react-native";
import { AppText } from "../../src/components/AppText";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAlarmStore, Alarm } from "@/src/store/alarmStore";
import { useAlarmRinging } from "@/src/services/audio";
import { scheduleSnooze } from "@/src/services/notifications";
import { useVoiceCommand } from "@/src/hooks/useVoiceCommand";
import { Accelerometer } from "expo-sensors";
import * as Torch from "expo-torch";
import { useSettingsStore } from "@/src/store/settingsStore";
import { useTheme } from "@/src/theme/useTheme";
import { alarmRepository, AlarmHistory } from "@/src/db/alarmRepository";
import { auth } from "@/src/services/firebase";

type Props = { alarm: Alarm };

export function RingingScreen({ alarm }: Props) {
  const setRinging = useAlarmStore((s) => s.setRinging);
  const { startRinging, stopRinging } = useAlarmRinging();
  const { snoozeMinutes, flashEnabled, gradualVolume, autoVoice } = useSettingsStore();
  const flashRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const stoppedRef = useRef(false);
  const firedAtRef = useRef(Date.now());
  const { resetSnooze } = useSettingsStore();

  const { startListening, stopListening } = useVoiceCommand({
    prompt: "Diga 'parar' ou 'soneca'",
    onStop: () => handleStop("voice"),
    onSnooze: () => handleSnooze("voice"),
    continuous: true,
    onBeforeListen: () => stopFlash(),
    onAfterListen: () => { if (flashEnabled && !stoppedRef.current) startFlash(); },
  });
  const { colors, fonts } = useTheme();

  useEffect(() => {
    stoppedRef.current = false;
    firedAtRef.current = Date.now();
    startRinging(gradualVolume);
    Vibration.vibrate([300, 200, 300, 200], true);
    startShakeDetection();
    if (flashEnabled) startFlash();
    if (autoVoice) {
      setTimeout(() => {
        if (!stoppedRef.current) startListening();
      }, 5000);
    }

    return () => {
      stopRinging();
      stopListening();
      Vibration.cancel();
      stopFlash();
      Accelerometer.removeAllListeners();
    };
  }, []);


  function saveHistory(method: AlarmHistory["method"]) {
    try {
      const uid = auth.currentUser?.uid ?? "";
      alarmRepository.insertHistory({
        id: `${alarm.id}_${Date.now()}`,
        uid,
        alarm_id: alarm.id,
        label: alarm.label,
        hour: alarm.hour,
        minute: alarm.minute,
        fired_at: firedAtRef.current,
        stopped_at: Date.now(),
        method,
      });
    } catch (e) {
      console.warn("Erro ao salvar histórico:", e);
    }
  }

  function startFlash() {
    let on = false;
    flashRef.current = setInterval(async () => {
      try {
        await Torch.setStateAsync(on ? Torch.ON : Torch.OFF);
        on = !on;
      } catch (e: any) { }
    }, 500);
  }

  function stopFlash() {
    if (flashRef.current) { clearInterval(flashRef.current); flashRef.current = null; }
    try { Torch.setStateAsync(Torch.OFF); } catch (e) { }
  }

  function startShakeDetection() {
    Accelerometer.setUpdateInterval(200);
    Accelerometer.addListener((data) => {
      if (stoppedRef.current) return;
      if (shakeRef.current) {
        const delta =
          Math.abs(data.x - shakeRef.current.x) +
          Math.abs(data.y - shakeRef.current.y) +
          Math.abs(data.z - shakeRef.current.z);
        if (delta > 3) handleStop("shake");
      }
      shakeRef.current = data;
    });
  }

  function handleStop(method: AlarmHistory["method"] = "touch") {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    resetSnooze();
    saveHistory(method);
    stopRinging();
    stopFlash();
    Vibration.cancel();
    Accelerometer.removeAllListeners();
    setRinging(null);
  }

  async function handleSnooze(method: AlarmHistory["method"] = "touch") {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    saveHistory("snooze");
    stopRinging();
    stopFlash();
    Vibration.cancel();
    Accelerometer.removeAllListeners();
    await scheduleSnooze(alarm, snoozeMinutes);
    setRinging(null);
  }

  function formatTime(hour: number, minute: number) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      <Ionicons name="alarm" size={80} color={colors.accent} />
      <AppText size="huge" bold style={{ letterSpacing: 4 }}>{formatTime(alarm.hour, alarm.minute)}</AppText>
      {alarm.label ? <AppText size="xl" color="textSecondary">{alarm.label}</AppText> : null}
      <AppText size="sm" color="textSecondary" style={{ marginTop: 8 }}>Agite o celular ou diga "parar"</AppText>

      <TouchableOpacity style={[styles.micBtn, { borderColor: colors.accent }]} onPress={startListening} accessibilityLabel="Parar por voz">
        <Ionicons name="mic-outline" size={24} color={colors.accent} />
        <AppText size="sm" style={{ color: colors.accent }}>Comando de voz</AppText>
      </TouchableOpacity>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.snoozeBtn, { backgroundColor: colors.card }]}
          onPress={() => handleSnooze("touch")}
          accessibilityLabel="Soneca"
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={24} color={colors.text} />
          <AppText size="md" style={{ color: colors.text }}>Soneca ({snoozeMinutes} min)</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.stopBtn, { backgroundColor: colors.danger }]}
          onPress={() => handleStop("touch")}
          accessibilityLabel="Parar alarme"
          accessibilityRole="button"
        >
          <Ionicons name="stop-circle" size={28} color={colors.text} />
          <AppText size="md" bold style={{ color: colors.text }}>Parar</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center", gap: 16, zIndex: 999 },
  time: { fontSize: 80, fontWeight: "bold", color: "#fff", letterSpacing: 4 },
  label: { fontSize: 20, color: "#888" },
  hint: { fontSize: 13, color: "#555", marginTop: 8 },
  micBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: "#6C63FF" },
  micText: { color: "#6C63FF", fontSize: 14, fontWeight: "600" },
  buttons: { gap: 16, marginTop: 24, width: "100%", paddingHorizontal: 32 },
  snoozeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#333", paddingHorizontal: 40, paddingVertical: 18, borderRadius: 50 },
  snoozeText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  stopBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#ff4444", paddingHorizontal: 40, paddingVertical: 18, borderRadius: 50 },
  stopText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
});