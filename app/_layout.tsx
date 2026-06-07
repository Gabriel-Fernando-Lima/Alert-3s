import { useEffect } from "react";
import { Slot } from "expo-router";
import { setupAlarmListener, registerBackgroundTask } from "@/src/services/notifications";
import { RingingScreen } from "@/src/components/RingingScreen";
import { useAlarmStore } from "@/src/store/alarmStore";

export default function RootLayout() {
  const ringingAlarm = useAlarmStore((s) => s.ringingAlarm);

  useEffect(() => {
    registerBackgroundTask();
    const errorHandler = (error: any, isFatal?: boolean) => {
      console.log("🔴 ERRO GLOBAL:", error.message, "fatal:", isFatal);
    };
    ErrorUtils.setGlobalHandler(errorHandler);
    const unsub = setupAlarmListener();
    return unsub;
  }, []);



  return (
    <>
      <Slot />
      {ringingAlarm && <RingingScreen alarm={ringingAlarm} />}
    </>
  );
}