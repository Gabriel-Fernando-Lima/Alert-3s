import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/src/services/firebase";
import { useTheme } from "@/src/theme/useTheme";
import { useSettingsStore } from "@/src/store/settingsStore";

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { colors } = useTheme();
  const { tutorialSeen, load } = useSettingsStore();

  useEffect(() => {
    load(); // carrega settings antes de decidir rota
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!tutorialSeen) {
    return <Redirect href={"/tutorial" as any} />;
  }

  if (user) {
    return <Redirect href={"/(tabs)/alarms" as any} />;
  }

  return <Redirect href={"/(auth)/login" as any} />;
}