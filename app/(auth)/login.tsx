import { useState, useEffect } from "react";
import {
  View, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { AppText } from "../../src/components/AppText";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/src/services/firebase";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme/useTheme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { colors, fonts } = useTheme();

  useEffect(() => {
    const t = setTimeout(() => checkBiometric(), 500);
    return () => clearTimeout(t);
  }, []);

  async function checkBiometric() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      console.log("Biometric hardware:", compatible, "enrolled:", enrolled);

      if (!compatible || !enrolled) {
        setBiometricAvailable(false);
        return;
      }

      const savedUid = await AsyncStorage.getItem("@alert:last_uid");
      const savedEmail = await AsyncStorage.getItem("@alert:last_email");
      console.log("Saved uid:", savedUid, "email:", savedEmail);

      if (!savedUid && !savedEmail) {
        setBiometricAvailable(false);
        return;
      }

      if (savedUid) {
        const docRef = doc(db, "users", savedUid);
        const snap = await getDoc(docRef);
        console.log("Firestore snap exists:", snap.exists(), "data:", snap.data());
        setBiometricAvailable(snap.exists() && snap.data()?.biometricEnabled === true);
      } else {
        setBiometricAvailable(true);
      }
    } catch (e) {
      console.log("checkBiometric erro:", e);
      setBiometricAvailable(false);
    }
  }

  async function askToEnableBiometric(uid: string) {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!compatible || !enrolled) return;

    const docRef = doc(db, "users", uid);
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.biometricEnabled === true) return;

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
              await setDoc(docRef, { biometricEnabled: true }, { merge: true });
              await AsyncStorage.setItem("@alert:last_uid", uid);
              Alert.alert("Biometria cadastrada!", "Você pode entrar com a digital nas próximas vezes.");
            }
          },
        },
      ]
    );
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Atenção", "Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      await AsyncStorage.setItem("@alert:last_email", email);
      await AsyncStorage.setItem("@alert:last_password", password);
      await AsyncStorage.setItem("@alert:last_uid", uid);

      router.replace("/(tabs)/alarms" as any);

      setTimeout(() => askToEnableBiometric(uid), 800);
    } catch (error: any) {
      const msg =
        error.code === "auth/invalid-credential"
          ? "E-mail ou senha incorretos."
          : "Erro ao fazer login. Tente novamente.";
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Entre com sua biometria",
        fallbackLabel: "Usar senha",
        cancelLabel: "Cancelar",
      });

      if (!result.success) return;

      const savedEmail = await AsyncStorage.getItem("@alert:last_email");
      const savedPassword = await AsyncStorage.getItem("@alert:last_password");

      if (!savedEmail || !savedPassword) {
        Alert.alert("Atenção", "Faça login com e-mail e senha primeiro.");
        return;
      }

      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, savedEmail, savedPassword);
      await AsyncStorage.setItem("@alert:last_uid", cred.user.uid);
      router.replace("/(tabs)/alarms" as any);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível autenticar com biometria.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AppText size="huge" bold style={{ textAlign: "center", letterSpacing: 8, marginBottom: 4 }}>ALERT</AppText>
      <AppText size="sm" color="textSecondary" style={{ textAlign: "center", marginBottom: 24 }}>Faça login para continuar</AppText>

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="E-mail"
        placeholderTextColor={colors.textSecondary}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        accessibilityLabel="Campo de e-mail"
      />

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="Senha"
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        accessibilityLabel="Campo de senha"
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={handleLogin}
        disabled={loading}
        accessibilityLabel="Entrar"
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <AppText size="md" bold style={[styles.buttonText, { color: colors.text }]}>Entrar</AppText>
        )}
      </TouchableOpacity>

      {biometricAvailable && (
        <TouchableOpacity
          style={[styles.biometricBtn, { borderColor: colors.accent }]}
          onPress={handleBiometric}
          disabled={loading}
          accessibilityLabel="Entrar com biometria"
          accessibilityRole="button"
        >
          <Ionicons name="finger-print-outline" size={24} color={colors.accent} />
            <AppText size="md" style={{ color: colors.accent }}>Entrar com biometria</AppText>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => router.push("/(auth)/register" as any)}
        accessibilityLabel="Criar conta"
      >
        <AppText size="md" color="accent" style={{ textAlign: "center", marginTop: 8 }}>Não tem conta? Cadastre-se</AppText>
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
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6C63FF",
  },
  biometricText: {
    color: "#6C63FF",
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    color: "#6C63FF",
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
  },
});