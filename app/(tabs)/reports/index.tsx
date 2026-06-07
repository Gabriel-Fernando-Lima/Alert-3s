import { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { AppText } from "../../../src/components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { alarmRepository, AlarmHistory } from "@/src/db/alarmRepository";
import { auth } from "@/src/services/firebase";
import { initDB } from "@/src/db/schema";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useTheme } from "@/src/theme/useTheme";

const METHOD_LABEL: Record<string, string> = {
  touch: "Toque",
  voice: "Voz",
  shake: "Agitação",
  snooze: "Soneca",
};

const METHOD_ICON: Record<string, string> = {
  touch: "finger-print-outline",
  voice: "mic-outline",
  shake: "phone-portrait-outline",
  snooze: "time-outline",
};

const METHOD_COLOR: Record<string, string> = {
  touch: "#6C63FF",
  voice: "#4CAF50",
  shake: "#FF9800",
  snooze: "#888",
};

const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function ReportsScreen() {
  const { colors, fonts } = useTheme();
  const [history, setHistory] = useState<AlarmHistory[]>([]);
  const [weekData, setWeekData] = useState<{ day: string; hours: number }[]>([]);
  const uid = auth.currentUser?.uid ?? "";

  useFocusEffect(
    useCallback(() => {
      initDB();
      loadData();
    }, [])
  );

  function loadData() {
    const hist = alarmRepository.getHistory(uid);
    setHistory(hist);

    const last7 = alarmRepository.getHistoryLast7Days(uid);
    const grouped = buildWeekData(last7);
    setWeekData(grouped);
  }

  function buildWeekData(hist: AlarmHistory[]) {
    const days: { day: string; hours: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayLabel = DAYS_SHORT[date.getDay()];

      // Alarme que disparou neste dia (acordou)
      const alarmToday = hist.find((h) => {
        const d = new Date(h.fired_at);
        return d >= date && d < nextDate && h.method !== "snooze";
      });

      // Alarme que disparou no dia anterior (estimativa de quando dormiu)
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 1);
      const alarmYesterday = hist.find((h) => {
        const d = new Date(h.fired_at);
        return d >= prevDate && d < date && h.method !== "snooze";
      });

      let hours = 0;
      if (alarmToday) {
        const wokeUpAt = alarmToday.stopped_at ?? alarmToday.fired_at;

        if (alarmYesterday) {
          // Dormiu após o último alarme do dia anterior
          const sleptAt = alarmYesterday.stopped_at ?? alarmYesterday.fired_at;
          hours = (wokeUpAt - sleptAt) / (1000 * 60 * 60);
        } else {
          // Sem dado do dia anterior — estima dormiu às 22h
          const woke = new Date(wokeUpAt);
          const slept = new Date(woke);
          slept.setDate(slept.getDate() - 1);
          slept.setHours(22, 0, 0, 0);
          hours = (wokeUpAt - slept.getTime()) / (1000 * 60 * 60);
        }

        hours = Math.max(0, Math.min(12, parseFloat(hours.toFixed(1))));
      }

      days.push({ day: dayLabel, hours });
    }

    return days;
  }

  function formatDate(ts: number) {
    const d = new Date(ts);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  function formatDuration(firedAt: number, stoppedAt: number | null) {
    if (!stoppedAt) return "—";
    const diff = Math.round((stoppedAt - firedAt) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.round(diff / 60)}min`;
  }

  const maxHours = Math.max(...weekData.map((d) => d.hours), 8);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <AppText size="xxl" bold style={{ marginBottom: 24 }}>Relatórios</AppText>

      {/* Gráfico de sono */}
      <AppText size="sm" color="textSecondary" style={styles.sectionTitle}>Horas de Sono — Últimos 7 dias</AppText>
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        {weekData.every((d) => d.hours === 0) ? (
          <View style={styles.emptyChart}>
            <Ionicons name="moon-outline" size={40} color={colors.textSecondary} />
            <AppText size="md" color="textSecondary">Nenhum dado ainda</AppText>
            <AppText size="xs" color="textSecondary">Dispare um alarme para registrar</AppText>
          </View>
        ) : (
          <View style={styles.chart}>
            {weekData.map((d, i) => (
              <View key={i} style={styles.bar}>
                <AppText size="xs" style={styles.barValue}>{d.hours > 0 ? d.hours : ""}</AppText>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${(d.hours / maxHours) * 100}%` },
                      d.hours >= 7 ? styles.barGood : d.hours >= 5 ? styles.barOk : styles.barLow,
                    ]}
                  />
                </View>
                <AppText size="xs" style={styles.barLabel}>{d.day}</AppText>
              </View>
            ))}
          </View>
        )}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <AppText size="xs" style={styles.legendText}>≥7h (bom)</AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FF9800" }]} />
            <AppText size="xs" style={styles.legendText}>5-7h (ok)</AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <AppText size="xs" style={styles.legendText}>{"<5h (pouco)"}</AppText>
          </View>
        </View>
      </View>

      {/* Histórico */}
      <AppText size="sm" style={styles.sectionTitle}>Histórico de Alarmes</AppText>
      {history.length === 0 ? (
        <View style={styles.emptyHistory}>
          <Ionicons name="alarm-outline" size={48} color={colors.textSecondary} />
          <AppText size="md" color="textSecondary">Nenhum alarme registrado</AppText>
        </View>
      ) : (
        history.map((h, i) => {
          const methodColor = {
            touch: colors.accent,
            voice: colors.success,
            shake: "#FF9800",
            snooze: colors.textSecondary,
          } as Record<string, string>;

          return (
          <View key={i} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.historyLeft}>
              <AppText size="xl" bold style={{ color: colors.text }}>{String(h.hour).padStart(2, "0")}:{String(h.minute).padStart(2, "0")}</AppText>
              {h.label ? <AppText size="sm" color="textSecondary">{h.label}</AppText> : null}
              <AppText size="xs" color="textSecondary">{formatDate(h.fired_at)}</AppText>
            </View>
            <View style={styles.historyRight}>
              <View style={[styles.methodBadge, { backgroundColor: methodColor[h.method] + "22" }]}>
                <Ionicons
                  name={METHOD_ICON[h.method] as any}
                  size={14}
                  color={methodColor[h.method]}
                />
                <AppText size="sm" style={[styles.methodText, { color: methodColor[h.method] }]}>{METHOD_LABEL[h.method]}</AppText>
              </View>
              <AppText size="xs" color="textSecondary">{formatDuration(h.fired_at, h.stopped_at)}</AppText>
            </View>
          </View>
        )})
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", paddingHorizontal: 20, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 24 },
  sectionTitle: { fontSize: 13, color: "#888", fontWeight: "600", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
  chartCard: { backgroundColor: "#1a1a1a", borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: "#2a2a2a" },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 160, gap: 8, marginBottom: 12 },
  bar: { flex: 1, alignItems: "center", gap: 4 },
  barValue: { fontSize: 10, color: "#888", height: 16 },
  barTrack: { flex: 1, width: "100%", backgroundColor: "#2a2a2a", borderRadius: 4, justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 4, minHeight: 4 },
  barGood: { backgroundColor: "#6C63FF" },
  barOk: { backgroundColor: "#FF9800" },
  barLow: { backgroundColor: "#ff4444" },
  barLabel: { fontSize: 11, color: "#888" },
  legend: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: "#888" },
  emptyChart: { height: 120, justifyContent: "center", alignItems: "center", gap: 8 },
  emptyHistory: { alignItems: "center", gap: 8, paddingVertical: 40 },
  emptyText: { color: "#555", fontSize: 16, fontWeight: "600" },
  emptySubtext: { color: "#444", fontSize: 13 },
  historyCard: { backgroundColor: "#1a1a1a", borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#2a2a2a" },
  historyLeft: { gap: 2 },
  historyRight: { alignItems: "flex-end", gap: 6 },
  historyTime: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  historyLabel: { fontSize: 12, color: "#888" },
  historyDate: { fontSize: 11, color: "#555" },
  methodBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  methodText: { fontSize: 12, fontWeight: "600" },
  duration: { fontSize: 11, color: "#555" },
});