type ParsedAlarm = {
  hour: number;
  minute: number;
  days: number[];
  label: string;
} | null;

type ParsedReminder = {
  hour: number;
  minute: number;
  label: string;
} | null;

const DAY_MAP: Record<string, number> = {
  domingo: 0, dom: 0,
  segunda: 1, "segunda-feira": 1, seg: 1,
  terça: 2, terca: 2, "terça-feira": 2, ter: 2,
  quarta: 3, "quarta-feira": 3, qua: 3,
  quinta: 4, "quinta-feira": 4, qui: 4,
  sexta: 5, "sexta-feira": 5, sex: 5,
  sábado: 6, sabado: 6, sab: 6,
};

const COMMAND_PATTERNS = {
  stop: ["parar", "parar alarme", "desligar", "desliga", "silêncio", "silencio"],
  snooze: ["soneca", "mais cinco", "adiar", "cinco minutos"],
  create: ["criar alarme", "novo alarme", "acorda", "acordar", "me acorda", "colocar alarme"],
  nap: ["cochilo", "tirar um cochilo", "descansar"],
  reminder: ["lembre-me", "lembrete", "me lembra", "não esquecer", "me avisa"],
};

export function parseVoiceCommand(text: string): {
  type: "create" | "stop" | "snooze" | "nap" | "reminder" | "unknown";
  alarm?: ParsedAlarm;
  napMinutes?: number;
  reminder?: ParsedReminder;
} {
  const lower = text.toLowerCase().trim();

  // Cochilo rápido
  const napMatch = lower.match(/cochilo\s+(?:de\s+)?(\d+)\s*(?:minutos?|min)/);
  if (napMatch) {
    return { type: "nap", napMinutes: parseInt(napMatch[1]) };
  }

  // Cochilo sem número — padrão de 20 min
  if (COMMAND_PATTERNS.nap.some((p) => lower.includes(p)) && !lower.includes("alarme")) {
    const minMatch = lower.match(/(\d+)\s*(?:minutos?|min)/);
    return { type: "nap", napMinutes: minMatch ? parseInt(minMatch[1]) : 20 };
  }

  // Lembrete — verifica antes de create
  if (COMMAND_PATTERNS.reminder.some((p) => lower.includes(p))) {
    const reminder = extractReminderFromText(lower);
    return { type: "reminder", reminder };
  }

  // Criação de alarme
  if (COMMAND_PATTERNS.create.some((p) => lower.includes(p))) {
    const alarm = extractAlarmFromText(lower);
    return { type: "create", alarm };
  }

  // Tenta extrair horário diretamente
  const alarm = extractAlarmFromText(lower);
  if (alarm) return { type: "create", alarm };

  // Soneca
  if (COMMAND_PATTERNS.snooze.some((p) => lower.includes(p))) {
    return { type: "snooze" };
  }

  // Parar
  if (COMMAND_PATTERNS.stop.some((p) => lower.includes(p))) {
    return { type: "stop" };
  }

  return { type: "unknown" };
}

function extractReminderFromText(text: string): ParsedReminder {
  // Extrai horário
  const timeData = extractAlarmFromText(text);
  if (!timeData) return null;

  // Extrai label: tudo entre "lembre-me de/para" e "às/as/para as"
  let label = "";
  const labelMatch = text.match(
    /(?:lembre-me|me lembra|me avisa|lembrete)\s+(?:de|para|que|do|da)?\s*(.+?)\s+(?:às|as|para as|às|a partir)/
  );
  if (labelMatch) {
    label = labelMatch[1].trim();
  } else {
    // Fallback: tudo após o trigger e antes do horário
    const triggerMatch = text.match(
      /(?:lembre-me|me lembra|me avisa|lembrete)\s+(?:de|para|que|do|da)?\s*(.+)/
    );
    if (triggerMatch) {
      // Remove o horário do final
      label = triggerMatch[1]
        .replace(/\d{1,2}:\d{2}/, "")
        .replace(/\d{1,2}\s*hora[s]?/, "")
        .replace(/às|as|para as/, "")
        .trim();
    }
  }

  return { hour: timeData.hour, minute: timeData.minute, label: label || "Lembrete" };
}

function extractAlarmFromText(text: string): ParsedAlarm {
  let hour = -1;
  let minute = 0;

  const digitalMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (digitalMatch) {
    hour = parseInt(digitalMatch[1]);
    minute = parseInt(digitalMatch[2]);
  }

  if (hour === -1) {
    const horaMatch = text.match(/(\d{1,2})\s*(?:hora|horas)/);
    if (horaMatch) {
      hour = parseInt(horaMatch[1]);
      if (text.includes("meia")) minute = 30;
      else if (text.includes("quinze") || text.includes("15")) minute = 15;
      else if (text.includes("quarenta e cinco") || text.includes("45")) minute = 45;
      else {
        const minMatch = text.match(/e\s+(\d{1,2})\s*(?:minutos?|min)?/);
        if (minMatch) minute = parseInt(minMatch[1]);
      }
    }
  }

  if (hour === -1) {
    const extenso: Record<string, number> = {
      "uma": 1, "dois": 2, "duas": 2, "três": 3, "tres": 3,
      "quatro": 4, "cinco": 5, "seis": 6, "sete": 7,
      "oito": 8, "nove": 9, "dez": 10, "onze": 11, "doze": 12,
      "treze": 13, "catorze": 14, "quinze": 15, "dezesseis": 16,
      "dezessete": 17, "dezoito": 18, "dezenove": 19, "vinte": 20,
    };
    for (const [word, num] of Object.entries(extenso)) {
      if (text.includes(word)) {
        hour = num;
        if (text.includes("meia")) minute = 30;
        break;
      }
    }
  }

  if (hour === -1) return null;

  if (text.includes("da tarde") || text.includes("da noite") || text.includes("pm")) {
    if (hour < 12) hour += 12;
  } else if (text.includes("da manhã") || text.includes("am")) {
    if (hour === 12) hour = 0;
  }

  const days: number[] = [];
  for (const [word, dayNum] of Object.entries(DAY_MAP)) {
    if (text.includes(word)) {
      if (!days.includes(dayNum)) days.push(dayNum);
    }
  }
  if (text.includes("todo dia") || text.includes("todos os dias") || text.includes("diariamente")) {
    days.push(0, 1, 2, 3, 4, 5, 6);
  }
  if (text.includes("dia de semana") || text.includes("dias úteis") || text.includes("dias uteis")) {
    days.push(1, 2, 3, 4, 5);
  }
  if (text.includes("fim de semana") || text.includes("final de semana")) {
    days.push(0, 6);
  }

  let label = "";
  const labelMatch = text.match(/(?:chamado|com nome)\s+(.+?)(?:\s+(?:às|as|para|todo|segunda|terça|quarta|quinta|sexta|sábado|domingo|\d)|$)/);
  if (labelMatch && labelMatch[1].length > 2) {
    label = labelMatch[1].trim();
  }

  return { hour: hour % 24, minute, days: [...new Set(days)].sort(), label };
}

export function matchesCustomCommand(text: string, customCommands: Record<string, string>): string | null {
  const lower = text.toLowerCase().trim();
  for (const [action, command] of Object.entries(customCommands)) {
    if (lower.includes(command.toLowerCase())) return action;
  }
  return null;
}