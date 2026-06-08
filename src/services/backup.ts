import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { db, auth } from "./firebase";
import { alarmRepository } from "../db/alarmRepository";
import { Alarm } from "../store/alarmStore";
import { initDB } from "../db/schema";

export async function backupToFirestore(): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Usuário não autenticado");

  const alarms = alarmRepository.getAll(uid);
  const backupRef = collection(db, "users", uid, "alarm_backup");

  let count = 0;
  for (const alarm of alarms) {
    await setDoc(doc(backupRef, alarm.id), {
      ...alarm,
      days: JSON.stringify(alarm.days),
      backed_up_at: Date.now(),
      updated_at: alarm.created_at, // usa created_at como referência de versão
    });
    count++;
  }

  console.log(`☁️ Backup: ${count} alarmes enviados ao Firestore`);
  return count;
}

export async function restoreFromFirestore(): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Usuário não autenticado");

  initDB();
  const backupRef = collection(db, "users", uid, "alarm_backup");
  const snap = await getDocs(backupRef);

  if (snap.empty) return 0;

  const localAlarms = alarmRepository.getAll(uid);
  const localMap = new Map(localAlarms.map((a) => [a.id, a]));

  let count = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();

    const alarm: Alarm = {
      id: data.id,
      uid: data.uid,
      label: data.label,
      hour: data.hour,
      minute: data.minute,
      days: typeof data.days === "string" ? JSON.parse(data.days) : data.days,
      sound: data.sound,
      active: data.active,
      created_at: data.created_at,
    };

    const local = localMap.get(alarm.id);

    if (!local) {
      // Não existe localmente — insere
      alarmRepository.insert(alarm);
      count++;
    } else if ((data.updated_at ?? 0) > local.created_at) {
      // Firestore tem versão mais recente — substitui
      alarmRepository.update(alarm);
      count++;
    }
    // Se local é mais recente ou igual, mantém o local
  }

  console.log(`☁️ Restauração: ${count} alarmes sincronizados`);
  return count;
}

export async function syncAlarms(): Promise<void> {
  // Faz backup e restore em sequência para sincronização bidirecional
  await backupToFirestore();
  await restoreFromFirestore();
}

export async function getLastBackupDate(): Promise<number | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  try {
    const backupRef = collection(db, "users", uid, "alarm_backup");
    const snap = await getDocs(backupRef);
    if (snap.empty) return null;

    let latest = 0;
    snap.docs.forEach((d) => {
      const backedAt = d.data().backed_up_at ?? 0;
      if (backedAt > latest) latest = backedAt;
    });

    return latest > 0 ? latest : null;
  } catch {
    return null;
  }
}