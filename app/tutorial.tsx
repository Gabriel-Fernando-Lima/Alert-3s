import { useState } from "react";
import {
  View, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/src/components/AppText";
import { useSettingsStore } from "@/src/store/settingsStore";
import { useTheme } from "@/src/theme/useTheme";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "alarm-outline",
    title: "Bem-vindo ao ALERT",
    description: "Um sistema de alarme acessível, criado para pessoas com dificuldades motoras ou mobilidade reduzida. Você controla tudo pela voz.",
    color: "#6C63FF",
  },
  {
    icon: "mic-outline",
    title: "Controle por Voz",
    description: 'Diga "criar alarme para as 7 da manhã" para criar um alarme. Quando tocar, diga "parar" ou "soneca" para controlá-lo sem tocar na tela.',
    color: "#4CAF50",
    commands: ["criar alarme para as 7h", "parar", "soneca", "cochilo de 20 minutos"],
  },
  {
    icon: "phone-portrait-outline",
    title: "Gestos e Acessibilidade",
    description: "Agite o celular para parar o alarme. O flash pisca para pessoas com deficiência auditiva. O volume aumenta gradualmente para despertar suavemente.",
    color: "#FF9800",
    features: ["Agitar para parar", "Flash para deficientes auditivos", "Volume gradual", "Brilho progressivo"],
  },
  {
    icon: "settings-outline",
    title: "Personalize do seu jeito",
    description: "Ajuste comandos de voz, sons, padrões de vibração e muito mais nas configurações do perfil. O app se adapta a você.",
    color: "#E91E63",
    features: ["Comandos personalizáveis", "Múltiplos idiomas", "Temas de alto contraste", "Fontes grandes"],
  },
];

export default function TutorialScreen() {
  const [current, setCurrent] = useState(0);
  const { setTutorialSeen } = useSettingsStore();
  const { colors } = useTheme();

  async function handleFinish() {
    await setTutorialSeen(true);
    router.replace("/(auth)/login" as any);
  }

  async function handleSkip() {
    await setTutorialSeen(true);
    router.replace("/(auth)/login" as any);
  }

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <AppText size="sm" color="textSecondary">Pular</AppText>
        </TouchableOpacity>
      )}

      {/* Slide */}
      <View style={styles.slideContainer}>
        <View style={[styles.iconCircle, { backgroundColor: slide.color + "22" }]}>
          <Ionicons name={slide.icon as any} size={80} color={slide.color} />
        </View>

        <AppText size="xxl" bold style={{ textAlign: "center", marginTop: 32 }}>
          {slide.title}
        </AppText>

        <AppText size="md" color="textSecondary" style={{ textAlign: "center", marginTop: 16, lineHeight: 24, paddingHorizontal: 8 }}>
          {slide.description}
        </AppText>

        {/* Comandos de exemplo */}
        {"commands" in slide && slide.commands && (
          <View style={styles.examplesBox}>
            <AppText size="xs" color="textSecondary" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              Exemplos de comandos
            </AppText>
            {slide.commands.map((cmd, i) => (
              <View key={i} style={[styles.cmdChip, { backgroundColor: slide.color + "22", borderColor: slide.color + "44" }]}>
                <Ionicons name="mic-outline" size={14} color={slide.color} />
                <AppText size="sm" style={{ color: slide.color }}>"{cmd}"</AppText>
              </View>
            ))}
          </View>
        )}

        {/* Features */}
        {"features" in slide && slide.features && (
          <View style={styles.examplesBox}>
            {slide.features.map((feat, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={slide.color} />
                <AppText size="sm" color="textSecondary">{feat}</AppText>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => setCurrent(i)}>
            <View style={[
              styles.dot,
              { backgroundColor: i === current ? slide.color : colors.border },
              i === current && { width: 24 },
            ]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Botões de navegação */}
      <View style={styles.navRow}>
        {current > 0 ? (
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => setCurrent((p) => p - 1)}
            accessibilityLabel="Slide anterior"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
            <AppText size="md">Anterior</AppText>
          </TouchableOpacity>
        ) : <View style={{ flex: 1 }} />}

        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: slide.color, flex: 1.5 }]}
          onPress={isLast ? handleFinish : () => setCurrent((p) => p + 1)}
          accessibilityLabel={isLast ? "Começar a usar o app" : "Próximo slide"}
        >
          <AppText size="md" bold style={{ color: "#fff" }}>
            {isLast ? "Começar!" : "Próximo"}
          </AppText>
          <Ionicons name={isLast ? "rocket-outline" : "arrow-forward"} size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40,
  },
  skipBtn: {
    alignSelf: "flex-end", padding: 8,
  },
  slideContainer: {
    flex: 1, alignItems: "center", justifyContent: "center",
  },
  iconCircle: {
    width: 160, height: 160, borderRadius: 80,
    justifyContent: "center", alignItems: "center",
  },
  examplesBox: {
    marginTop: 24, width: "100%", gap: 8,
  },
  cmdChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1,
  },
  featureRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 4,
  },
  dots: {
    flexDirection: "row", justifyContent: "center",
    gap: 8, marginBottom: 24,
  },
  dot: {
    height: 8, width: 8, borderRadius: 4,
  },
  navRow: {
    flexDirection: "row", gap: 12,
  },
  navBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 50,
  },
});