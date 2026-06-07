import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useTheme } from "@/src/theme/useTheme";
import { auth } from "@/src/services/firebase";
import { router } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/src/services/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { colors, fonts } = useTheme();

  async function handleRegister() {
    if (!email || !password || !confirm) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Atenção", "As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Atenção", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      await AsyncStorage.setItem("@alert:last_email", email);
      await AsyncStorage.setItem("@alert:last_password", password);
      await AsyncStorage.setItem("@alert:last_uid", uid);

      router.replace("/(tabs)/alarms" as any);

      setTimeout(async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!compatible || !enrolled) return;

        Alert.alert(
          "Habilitar biometria",
          "Deseja usar sua digital para entrar nas próximas vezes?",
          [
            { text: "Agora não", style: "cancel" },
            {
              text: "Habilitar",
              onPress: async () => {
                const result = await LocalAuthentication.authenticateAsync({
                  promptMessage: "Confirme sua digital para cadastrar",
                  cancelLabel: "Cancelar",
                });
                if (result.success) {
                  await setDoc(doc(db, "users", uid), { biometricEnabled: true }, { merge: true });
                  Alert.alert("Biometria cadastrada!", "Você pode entrar com a digital nas próximas vezes.");
                }
              },
            },
          ]
        );
      }, 800);
    } catch (error: any) {
      const msg =
        error.code === "auth/email-already-in-use"
          ? "Este e-mail já está cadastrado."
          : "Erro ao criar conta. Tente novamente.";
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={[styles.title, { color: colors.text, fontSize: fonts.huge }]}>ALERT</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Crie sua conta</Text>

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="E-mail"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        accessibilityLabel="Campo de e-mail"
      />

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="Senha"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        accessibilityLabel="Campo de senha"
      />

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="Confirmar senha"
        placeholderTextColor="#888"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        accessibilityLabel="Campo de confirmar senha"
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={handleRegister}
        disabled={loading}
        accessibilityLabel="Criar conta"
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.text }]}>Criar conta</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        accessibilityLabel="Voltar para login"
      >
        <Text style={[styles.link, { color: colors.accent }]}>Já tem conta? Entrar</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  button: {
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  link: {
    color: "#6C63FF",
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
  },
});