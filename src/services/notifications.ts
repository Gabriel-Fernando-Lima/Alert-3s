import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import * as SMS from "expo-sms";
import { Alarm } from "../store/alarmStore";
import { useAlarmStore } from "../store/alarmStore";
import { useSettingsStore } from "../store/settingsStore";

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error("Background task error:", error);
    return;
  }
  if (data?.notification) {
    const alarm = data.notification.request.content.data?.alarm;
    if (alarm) {
      useAlarmStore.getState().setRinging(alarm);
    }
  }
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerBackgroundTask() {
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  } catch (e) {
    console.log("Background task já registrada ou erro:", e);
  }
}

export function setupAlarmListener() {
  const subReceived = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as any;
    if (data?.alarm) {
      useAlarmStore.getState().setRinging(data.alarm);
    }
  });

  const subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as any;
    if (data?.alarm) {
      useAlarmStore.getState().setRinging(data.alarm);
    }
  });

  return () => {
    subReceived.remove();
    subResponse.remove();
  };
}

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleAlarm(alarm: Alarm) {
  await cancelAlarm(alarm.id);
  if (!alarm.active) return;

  const content = {
    title: "⏰ ALERT",
    body: alarm.label || "Hora de acordar!",
    sound: "alarm_default.mp3",
    data: { alarm },
  };

  if (alarm.days.length === 0) {
    await Notifications.scheduleNotificationAsync({
      identifier: alarm.id,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextOccurrence(alarm.hour, alarm.minute),
      },
    });
  } else {
    for (const day of alarm.days) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${alarm.id}_${day}`,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day + 1,
          hour: alarm.hour,
          minute: alarm.minute,
        },
      });
    }
  }
}

export async function scheduleSnooze(alarm: Alarm, minutes = 5) {
  const { emergencyContact, incrementSnooze } = useSettingsStore.getState();
  const count = incrementSnooze();

  console.log(`💤 Soneca #${count} para alarme ${alarm.id}`);

  // Após 3 sonecas, envia SMS de emergência
  if (count >= 3 && emergencyContact) {
    await sendEmergencySMS(alarm, emergencyContact, count);
  }

  const snoozeDate = new Date(Date.now() + minutes * 60 * 1000);
  await Notifications.scheduleNotificationAsync({
    identifier: `${alarm.id}_snooze`,
    content: {
      title: "⏰ ALERT — Soneca",
      body: alarm.label || "Hora de acordar!",
      sound: "alarm_default.mp3",
      data: { alarm },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: snoozeDate,
    },
  });
}

async function sendEmergencySMS(alarm: Alarm, phone: string, snoozeCount: number) {
  try {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      console.warn("SMS não disponível neste dispositivo");
      return;
    }

    const time = `${String(alarm.hour).padStart(2, "0")}:${String(alarm.minute).padStart(2, "0")}`;
    const message = `⚠️ ALERTA: ${alarm.label || "Alarme"} das ${time} foi adiado ${snoozeCount} vezes sem resposta. Por favor, verifique se está tudo bem.`;

    console.log(`📱 Enviando SMS de emergência para ${phone}`);

    await SMS.sendSMSAsync([phone], message);
  } catch (e) {
    console.warn("Erro ao enviar SMS:", e);
  }
}

export async function cancelAlarm(id: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier === id || n.identifier.startsWith(`${id}_`)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

function nextOccurrence(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}