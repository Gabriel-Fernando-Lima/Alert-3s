import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from "react-native";
import { AppText } from "../../../src/components/AppText";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAlarmStore } from "@/src/store/alarmStore";
import { useAlarmRinging } from "@/src/services/audio";
import { useSettingsStore } from "@/src/store/settingsStore";
import { scheduleAlarm, requestNotificationPermission } from "@/src/services/notifications";
import { useAlarmAudio } from "@/src/services/audio";
import { auth } from "@/src/services/firebase";
import { useTheme } from "@/src/theme/useTheme";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const SOUNDS = ["default", "beep", "digital", "nature"];



export default function CreateAlarmScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const { add, update, alarms } = useAlarmStore();
  const { playPreview } = useAlarmAudio();
  const uid = auth.currentUser?.uid ?? "";

  const [time, setTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [label, setLabel] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedSound, setSelectedSound] = useState("default");

  const { setRinging } = useAlarmStore();
  const { gradualVolume } = useSettingsStore();
  const { startRinging, stopRinging } = useAlarmRinging();
  const [testingAlarm, setTestingAlarm] = useState(false);
  const { colors, fonts } = useTheme();

  useEffect(() => {
    if (isEditing) {
      const alarm = alarms.find((a) => a.id === id);
      if (alarm) {
        const d = new Date();
        d.setHours(alarm.hour, alarm.minute, 0, 0);
        setTime(d);
        setLabel(alarm.label);
        setSelectedDays(alarm.days);
        setSelectedSound(alarm.sound);
      }
    }
  }, [id]);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert("Permissão negada", "Precisamos de permissão para notificações.");
      return;
    }

    const alarm = {
      id: isEditing ? id! : Date.now().toString(),
      uid,
      label,
      hour: time.getHours(),
      minute: time.getMinutes(),
      days: selectedDays.sort(),
      sound: selectedSound,
      active: true,
      created_at: isEditing
        ? alarms.find((a) => a.id === id)!.created_at
        : Date.now(),
    };

    if (isEditing) {
      update(alarm);
    } else {
      add(alarm);
    }

    await scheduleAlarm(alarm);
    router.back();
  }

  async function handleTestAlarm() {


    if (testingAlarm) {
      stopRinging();
      setRinging(null);
      setTestingAlarm(false);
      return;
    }

    const testAlarm = {
      id: "test",
      uid: "",
      label: label || "Teste de alarme",
      hour: time.getHours(),
      minute: time.getMinutes(),
      days: selectedDays,
      sound: selectedSound,
      active: true,
      created_at: Date.now(),
    };

    setTestingAlarm(true);
    setRinging(testAlarm);
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <AppText size="lg" bold>{isEditing ? "Editar Alarme" : "Novo Alarme"}</AppText>
        <TouchableOpacity onPress={handleSave}>
          <AppText size="md" style={{ color: colors.accent }}>Salvar</AppText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.timePicker} onPress={() => setShowPicker(true)}>
        <AppText size="huge" bold style={{ letterSpacing: 4 }}>{`${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`}</AppText>
        <AppText size="xs" color="textSecondary">Toque para alterar</AppText>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour
          display="spinner"
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) setTime(date);
          }}
        />
      )}

      <AppText size="sm" style={styles.sectionTitle}>Nome do alarme</AppText>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="Ex: Acordar para academia"
        placeholderTextColor={colors.textSecondary}
        value={label}
        onChangeText={setLabel}
      />

      <AppText size="sm" style={styles.sectionTitle}>Repetir</AppText>
      <View style={styles.daysRow}>
        {DAYS.map((d, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.dayBtn, { backgroundColor: colors.card, borderColor: colors.border }, selectedDays.includes(i) && { backgroundColor: colors.accent, borderColor: colors.accent }]}
            onPress={() => toggleDay(i)}
          >
            <Text style={[styles.dayBtnText, { color: colors.textSecondary }, selectedDays.includes(i) && { color: colors.text }]}>
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <AppText size="sm" style={styles.sectionTitle}>Som</AppText>
      <View style={styles.soundsRow}>
        {SOUNDS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.soundBtn, selectedSound === s && styles.soundBtnActive]}
            onPress={() => setSelectedSound(s)}
          >
            <Text style={[styles.soundBtnText, selectedSound === s && styles.soundBtnTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.previewBtn, { backgroundColor: colors.card, borderColor: testingAlarm ? colors.danger : colors.border }]}
        onPress={handleTestAlarm}
        accessibilityLabel="Testar alarme completo"
      >
        <Ionicons
          name={testingAlarm ? "stop-circle-outline" : "alarm-outline"}
          size={20}
          color={testingAlarm ? colors.danger : colors.accent}
        />
        <AppText size="md" style={[styles.previewText, testingAlarm && { color: colors.danger }]}>{testingAlarm ? "Parar teste" : "Testar alarme completo"}</AppText>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.previewBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={playPreview}>
        <Ionicons name="play-circle-outline" size={20} color={colors.accent} />
        <AppText size="md" style={{ color: colors.accent }}>Testar som</AppText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", paddingHorizontal: 20, paddingTop: 60 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  header: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  saveBtn: { fontSize: 16, color: "#6C63FF", fontWeight: "bold" },
  timePicker: { alignItems: "center", marginBottom: 32, gap: 4 },
  timeText: { fontSize: 72, fontWeight: "bold", color: "#fff", letterSpacing: 4 },
  timeHint: { fontSize: 12, color: "#555" },
  sectionTitle: { fontSize: 13, color: "#888", fontWeight: "600", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
  input: {
    backgroundColor: "#1a1a1a", borderRadius: 12, padding: 16,
    color: "#fff", fontSize: 16, borderWidth: 1, borderColor: "#2a2a2a", marginBottom: 24,
  },
  daysRow: { flexDirection: "row", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  dayBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a" },
  dayBtnActive: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" },
  dayBtnText: { color: "#888", fontSize: 13, fontWeight: "600" },
  dayBtnTextActive: { color: "#fff" },
  soundsRow: { flexDirection: "row", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  soundBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a" },
  soundBtnActive: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" },
  soundBtnText: { color: "#888", fontSize: 13 },
  soundBtnTextActive: { color: "#fff" },
  previewBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, backgroundColor: "#1a1a1a", borderRadius: 12, borderWidth: 1, borderColor: "#2a2a2a" },
  previewText: { color: "#6C63FF", fontSize: 15, fontWeight: "600" },
});