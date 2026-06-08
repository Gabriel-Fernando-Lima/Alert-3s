import { View, TouchableOpacity, StyleSheet, Vibration, Alert, TextInput } from "react-native";
import { AppText } from "../../src/components/AppText";
import { useEffect, useRef, useState } from "react";
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
import * as Brightness from "expo-brightness";


type Props = { alarm: Alarm };

export function RingingScreen({ alarm }: Props) {
  const setRinging = useAlarmStore((s) => s.setRinging);
  const { startRinging, stopRinging } = useAlarmRinging();
  const { snoozeMinutes, flashEnabled, gradualVolume, autoVoice, shakeEnabled, challengeEnabled } = useSettingsStore();
  const flashRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const stoppedRef = useRef(false);
  const firedAtRef = useRef(Date.now());
  const { resetSnooze } = useSettingsStore();

  const brightnessRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [challengeQuestion, setChallengeQuestion] = useState({ a: 0, b: 0, answer: 0 });

  const MOTIVATIONAL = [
    "Bom dia! Hoje você vai conquistar seus objetivos! 💪",
    "Acorda! O mundo precisa do seu melhor hoje! 🌟",
    "Cada manhã é uma nova chance de ser incrível! ☀️",
    "Levanta! Seus sonhos não vão se realizar sozinhos! 🚀",
    "Bom dia! Um dia de cada vez — hoje é o seu dia! 🌈",
  ];
  const motivational = useRef(MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]);


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
    startBrightnessRamp();
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
      stopBrightnessRamp();
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
    if (!shakeEnabled) return; // ← adiciona essa linha
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

  async function startBrightnessRamp() {
    try {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status !== "granted") return;
      await Brightness.setBrightnessAsync(0.1);
      let bri = 0.1;
      brightnessRef.current = setInterval(async () => {
        bri = Math.min(1, bri + 0.05);
        await Brightness.setBrightnessAsync(bri);
        if (bri >= 1 && brightnessRef.current) {
          clearInterval(brightnessRef.current);
          brightnessRef.current = null;
        }
      }, 2000);
    } catch (e) { }
  }

  async function stopBrightnessRamp() {
    if (brightnessRef.current) { clearInterval(brightnessRef.current); brightnessRef.current = null; }
    try { await Brightness.setBrightnessAsync(1); } catch (e) { }
  }

  async function increaseBrightnessNow() {
    try {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status !== "granted") return;
      await Brightness.setBrightnessAsync(1);
    } catch (e) { }
  }

  // Desafio — Req 27:
  function generateChallenge() {
    const a = Math.floor(Math.random() * 20) + 5;
    const b = Math.floor(Math.random() * 10) + 2;
    setChallengeQuestion({ a, b, answer: a + b });
    setChallengeAnswer("");
    setShowChallenge(true);
  }

  function handleChallengeSubmit() {
    if (parseInt(challengeAnswer) === challengeQuestion.answer) {
      setShowChallenge(false);
      handleStop("touch");
    } else {
      setChallengeAnswer("");
      Alert.alert("Incorreto!", "Tente novamente para desligar o alarme.");
    }
  }

  function formatTime(hour: number, minute: number) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }



  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      <Ionicons name="alarm" size={80} color={colors.accent} />
      <AppText size="huge" bold style={{ letterSpacing: 4 }}>{formatTime(alarm.hour, alarm.minute)}</AppText>
      {alarm.label ? <AppText size="xl" color="textSecondary">{alarm.label}</AppText> : null}
      <AppText size="sm" color="textSecondary" style={{ textAlign: "center", paddingHorizontal: 32, fontStyle: "italic" }}>
        {motivational.current}
      </AppText>
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

      <TouchableOpacity
        style={[styles.stopBtn, { backgroundColor: colors.danger }]}
        onPress={() => challengeEnabled ? generateChallenge() : handleStop("touch")}
        accessibilityLabel="Parar alarme"
      >
        <Ionicons name="stop-circle" size={28} color={colors.text} />
        <AppText size="md" bold style={{ color: colors.text }}>Parar</AppText>
      </TouchableOpacity>

      {showChallenge && (
        <View style={styles.challengeOverlay}>
          <View style={[styles.challengeBox, { backgroundColor: colors.card }]}>
            <AppText size="lg" bold style={{ textAlign: "center" }}>Resolva para desligar</AppText>
            <AppText size="huge" bold style={{ textAlign: "center", color: colors.accent }}>
              {challengeQuestion.a} + {challengeQuestion.b} = ?
            </AppText>
            <AppText size="sm" color="textSecondary" style={{ textAlign: "center" }}>Resolva o cálculo para desligar o alarme. O brilho aumentará enquanto o alarme toca.</AppText>
            <TextInput
              style={[styles.challengeInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              keyboardType="numeric"
              value={challengeAnswer}
              onChangeText={setChallengeAnswer}
              placeholder="Resposta"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.stopBtn, { backgroundColor: colors.danger, width: "100%" }]}
              onPress={handleChallengeSubmit}
            >
              <AppText size="md" bold style={{ color: colors.text }}>Resolver desafio e desligar</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowChallenge(false)}>
              <AppText size="sm" color="textSecondary">Cancelar</AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
  challengeOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center",
    alignItems: "center", padding: 32, zIndex: 1000,
  },
  challengeBox: {
    width: "100%", borderRadius: 20, padding: 24,
    gap: 16, alignItems: "center",
  },
  challengeInput: {
    width: "100%", borderRadius: 12, padding: 16,
    fontSize: 24, textAlign: "center", borderWidth: 1,
  },
});