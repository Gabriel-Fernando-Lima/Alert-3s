import { useEffect, useState } from "react";
import {
  View, FlatList, TouchableOpacity,
  Switch, StyleSheet, Alert, Text,
} from "react-native";
import { AppText } from "../../../src/components/AppText";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAlarmStore, Alarm } from "@/src/store/alarmStore";
import { initDB } from "@/src/db/schema";
import { scheduleAlarm, cancelAlarm, scheduleSnooze } from "@/src/services/notifications";
import { auth } from "@/src/services/firebase";
import { useVoiceCommand } from "@/src/hooks/useVoiceCommand";
import { useTheme } from "@/src/theme/useTheme";
import * as Notifications from "expo-notifications";
import { syncAlarms } from "@/src/services/backup";

const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function AlarmsScreen() {
  const { alarms, load, remove, toggle, add } = useAlarmStore();
  const uid = auth.currentUser?.uid ?? "";
  const [voiceStatus, setVoiceStatus] = useState("");
  const { colors, fonts, highContrast } = useTheme();

  function showStatus(msg: string) {
    setVoiceStatus(msg);
    setTimeout(() => setVoiceStatus(""), 3000);
  }

  const { listening, startListening, stopListening } = useVoiceCommand({
    onCreateAlarm: async (hour, minute, days, label) => {
      const alarm: Alarm = {
        id: Date.now().toString(),
        uid,
        label: label || "",
        hour,
        minute,
        days,
        sound: "default",
        active: true,
        created_at: Date.now(),
      };
      add(alarm);
      await scheduleAlarm(alarm);
      showStatus(`✅ Alarme criado para ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    },

    onNap: async (minutes) => {
      const napDate = new Date(Date.now() + minutes * 60 * 1000);
      const napHour = napDate.getHours();
      const napMinute = napDate.getMinutes();

      const napAlarm: Alarm = {
        id: `nap_${Date.now()}`,
        uid,
        label: `Cochilo de ${minutes} min`,
        hour: napHour,
        minute: napMinute,
        days: [],
        sound: "default",
        active: true,
        created_at: Date.now(),
      };

      add(napAlarm);
      await scheduleAlarm(napAlarm);
      showStatus(`😴 Cochilo de ${minutes} min agendado para ${String(napHour).padStart(2, "0")}:${String(napMinute).padStart(2, "0")}`);
    },

    onReminder: async (hour, minute, label) => {
      await Notifications.scheduleNotificationAsync({
        identifier: `reminder_${Date.now()}`,
        content: {
          title: "🔔 Lembrete",
          body: label,
          sound: "alarm_default.mp3",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextOccurrence(hour, minute),
        },
      });
      showStatus(`🔔 Lembrete "${label}" criado para ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    },
  });

  useEffect(() => {
    initDB();
    load(uid);
    syncAlarms()
      .then(() => load(uid))
      .catch((e) => console.warn("Sync falhou:", e));
  }, []);

  function nextOccurrence(hour: number, minute: number): Date {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }

  function handleToggle(alarm: Alarm) {
    const next = !alarm.active;
    toggle(alarm.id, next, uid);
    if (next) scheduleAlarm({ ...alarm, active: true });
    else cancelAlarm(alarm.id);
  }

  function handleDelete(alarm: Alarm) {
    Alert.alert(
      "Excluir alarme",
      `Deseja excluir "${alarm.label || formatTime(alarm.hour, alarm.minute)}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            cancelAlarm(alarm.id);
            remove(alarm.id, uid);
          },
        },
      ]
    );
  }

  function formatTime(hour: number, minute: number) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function handleVoiceBtn() {
    if (listening) stopListening();
    else startListening();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppText size="xxl" bold style={{ marginBottom: 24 }}>Meus Alarmes</AppText>

      {voiceStatus ? (
        <View style={[styles.voiceStatus, { backgroundColor: colors.card, borderColor: colors.accent }]}>
          <Text style={[styles.voiceStatusText, { color: colors.accent }]}>{voiceStatus}</Text>
        </View>
      ) : null}

      {alarms.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="alarm-outline" size={64} color={colors.textSecondary} />
          <AppText color="textSecondary" size="lg" style={{ fontWeight: "600" }}>Nenhum alarme criado</AppText>
          <AppText color="textSecondary" size="sm">Toque no + ou no mic para adicionar</AppText>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, !item.active && styles.cardInactive]}>
              <TouchableOpacity
                style={styles.cardLeft}
                onPress={() => router.push({ pathname: "/(tabs)/alarms/create" as any, params: { id: item.id } })}
                accessibilityLabel={`Editar alarme ${formatTime(item.hour, item.minute)}`}
              >
                <AppText size="xxl" bold color={item.active ? "text" : "textSecondary"}>
                  {formatTime(item.hour, item.minute)}
                </AppText>
                {item.label ? <AppText size="sm" color="textSecondary">{item.label}</AppText> : null}
                <View style={styles.days}>
                  {DAYS.map((d, i) => (
                    <Text key={i} style={[styles.day, { color: colors.textSecondary }, item.days.includes(i) && { color: colors.accent }]}>
                      {d}
                    </Text>
                  ))}
                </View>
              </TouchableOpacity>

              <View style={styles.cardRight}>
                <Switch
                  value={item.active}
                  onValueChange={() => handleToggle(item)}
                  trackColor={{ false: colors.card, true: colors.accent }}
                  thumbColor={colors.text}
                />
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.fabVoice, { backgroundColor: listening ? colors.danger : colors.card }]}
        onPress={handleVoiceBtn}
        accessibilityLabel={listening ? "Parar gravação" : "Comando de voz"}
      >
        <Ionicons name={listening ? "stop" : "mic-outline"} size={28} color={colors.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => router.push("/(tabs)/alarms/create" as any)}
        accessibilityLabel="Criar novo alarme"
      >
        <Ionicons name="add" size={32} color={highContrast ? colors.background : colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 60 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  card: { borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1 },
  cardInactive: { opacity: 0.5 },
  cardLeft: { gap: 4, flex: 1 },
  cardRight: { alignItems: "center", gap: 12 },
  days: { flexDirection: "row", gap: 6, marginTop: 4 },
  day: { fontSize: 12, fontWeight: "600" },
  deleteBtn: { padding: 4 },
  voiceStatus: { borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1 },
  voiceStatusText: { fontSize: 14, textAlign: "center" },
  fab: { position: "absolute", bottom: 32, right: 24, width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 8 },
  fabVoice: { position: "absolute", bottom: 32, right: 100, width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 8 },
});