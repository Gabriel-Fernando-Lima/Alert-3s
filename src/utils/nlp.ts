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

const DAY_MAPS: Record<string, Record<string, number>> = {
  "pt-BR": {
    domingo: 0, dom: 0,
    segunda: 1, "segunda-feira": 1, seg: 1,
    terça: 2, terca: 2, "terça-feira": 2, ter: 2,
    quarta: 3, "quarta-feira": 3, qua: 3,
    quinta: 4, "quinta-feira": 4, qui: 4,
    sexta: 5, "sexta-feira": 5, sex: 5,
    sábado: 6, sabado: 6, sab: 6,
  },
  "en-US": {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
  },
  "es-ES": {
    domingo: 0, dom: 0,
    lunes: 1, lun: 1,
    martes: 2, mar: 2,
    miercoles: 3, miércoles: 3, mie: 3,
    jueves: 4, jue: 4,
    viernes: 5, vie: 5,
    sabado: 6, sábado: 6, sab: 6,
  }
};

const COMMAND_PATTERNS: Record<string, Record<string, string[]>> = {
  "pt-BR": {
    stop: ["parar", "parar alarme", "desligar", "desliga", "silêncio", "silencio"],
    snooze: ["soneca", "mais cinco", "adiar", "cinco minutos"],
    create: ["criar alarme", "novo alarme", "acorda", "acordar", "me acorda", "colocar alarme"],
    nap: ["cochilo", "tirar um cochilo", "descansar"],
    reminder: ["lembre-me", "lembrete", "me lembra", "não esquecer", "me avisa"],
  },
  "en-US": {
    stop: ["stop", "stop alarm", "turn off", "turn off alarm", "silence"],
    snooze: ["snooze", "snooze alarm", "later", "five minutes"],
    create: ["create alarm", "new alarm", "set alarm", "wake me", "wake me up"],
    nap: ["nap", "take a nap", "rest"],
    reminder: ["remind me", "reminder", "remind", "don't forget"],
  },
  "es-ES": {
    stop: ["parar", "detener", "apagar", "silenciar"],
    snooze: ["posponer", "snooze", "cinco minutos", "más cinco"],
    create: ["crear alarma", "nueva alarma", "poner alarma", "despiértame", "despertarme"],
    nap: ["siesta", "dormitar", "tomar una siesta"],
    reminder: ["recuérdame", "recordatorio", "no olvidar", "recuérdame que"],
  }
};

export function parseVoiceCommand(text: string, lang: "pt-BR" | "en-US" | "es-ES" = "pt-BR"): {
  type: "create" | "stop" | "snooze" | "nap" | "reminder" | "unknown";
  alarm?: ParsedAlarm;
  napMinutes?: number;
  reminder?: ParsedReminder;
} {
  const lower = text.toLowerCase().trim();
  const patterns = COMMAND_PATTERNS[lang] ?? COMMAND_PATTERNS["pt-BR"];
  const dayMap = DAY_MAPS[lang] ?? DAY_MAPS["pt-BR"];

  // Cochilo / nap com horas
  const napMatch = lower.match(/(?:cochilo|nap)\s+(?:de\s+)?(\d+)\s*(?:hora[s]?|h|hours?)\b/);
  if (napMatch) {
    return { type: "nap", napMinutes: parseInt(napMatch[1]) * 60 };
  }

  const napMatchMin = lower.match(/(?:cochilo|nap)\s+(?:de\s+)?(\d+)\s*(?:minutos?|min|minutes?|mins?)/);
  if (napMatchMin) {
    return { type: "nap", napMinutes: parseInt(napMatchMin[1]) };
  }



  // Cochilo sem número — padrão de 20 min
  if (patterns.nap.some((p) => lower.includes(p)) && !lower.includes("alarme") && !lower.includes("alarm")) {
    const minMatch = lower.match(/(\d+)\s*(?:minutos?|min)/);
    return { type: "nap", napMinutes: minMatch ? parseInt(minMatch[1]) : 20 };
  }

  // Lembrete — verifica antes de create
  if (patterns.reminder.some((p) => lower.includes(p))) {
    const reminder = extractReminderFromText(lower, lang);
    return { type: "reminder", reminder };
  }

  // Criação de alarme
  if (patterns.create.some((p) => lower.includes(p))) {
    const alarm = extractAlarmFromText(lower, lang);
    return { type: "create", alarm };
  }

  // Tenta extrair horário diretamente
  const alarm = extractAlarmFromText(lower, lang);
  if (alarm) return { type: "create", alarm };

  // Soneca
  if (patterns.snooze.some((p) => lower.includes(p))) {
    return { type: "snooze" };
  }

  // Parar
  if (patterns.stop.some((p) => lower.includes(p))) {
    return { type: "stop" };
  }

  return { type: "unknown" };
}

function extractReminderFromText(text: string, lang: "pt-BR" | "en-US" | "es-ES" = "pt-BR"): ParsedReminder {
  const timeData = extractAlarmFromText(text, lang);
  if (!timeData) return null;

  // Remove o trigger do início
  let remaining = text
    .replace(/(?:lembre-me|me lembra|me avisa|lembrete|remind me|recuérdame|recuérdame que|recordatorio)\s+(?:de|para|que|do|da|to)?\s*/i, "")
    .trim();

  // Remove o horário e tudo depois dele do final
  remaining = remaining
    .replace(/\s*(?:às|as|para as|a partir das?|at|a las?)\s*\d{1,2}(?::\d{2})?\s*(?:hora[s]?|hours?)?.*$/i, "")
    .replace(/\s*\d{1,2}\s*hora[s]?.*$/i, "")
    .replace(/\s*\d{1,2}:\d{2}.*$/i, "")
    .trim();

  return {
    hour: timeData.hour,
    minute: timeData.minute,
    label: remaining || "Lembrete",
  };
}

function extractAlarmFromText(text: string, lang: "pt-BR" | "en-US" | "es-ES" = "pt-BR"): ParsedAlarm {
  let hour = -1;
  let minute = 0;

  const digitalMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (digitalMatch) {
    hour = parseInt(digitalMatch[1]);
    minute = parseInt(digitalMatch[2]);
  }

  if (hour === -1) {
    const horaMatch = text.match(/(\d{1,2})\s*(?:hora|horas|hour|hours)/);
    if (horaMatch) {
      hour = parseInt(horaMatch[1]);
      if (text.includes("meia")) minute = 30;
      else if (text.includes("quinze") || text.includes("15") || text.includes("fifteen")) minute = 15;
      else if (text.includes("quarenta e cinco") || text.includes("45") || text.includes("forty five") || text.includes("forty-five")) minute = 45;
      else {
        const minMatch = text.match(/(?:e\s+|and\s+|y\s+)(\d{1,2})\s*(?:minutos?|min|minutes?)?/);
        if (minMatch) minute = parseInt(minMatch[1]);
      }
    }
  }

  if (hour === -1) {
    const extenso: Record<string, number> = {
      "uma": 1, "dois": 2, "duas": 2, "três": 3,
      "quatro": 4, "cinco": 5, "seis": 6, "sete": 7,
      "oito": 8, "nove": 9, "dez": 10, "onze": 11, "doze": 12,
      "treze": 13, "catorze": 14, "quinze": 15, "dezesseis": 16,
      "dezessete": 17, "dezoito": 18, "dezenove": 19, "vinte": 20,
      // English
      "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
      "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
      "eleven": 11, "twelve": 12,
      // Spanish
      "uno": 1, "dos": 2, "tres": 3, "cuatro": 4,
      "ses": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
      "once": 11, "doce": 12,
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

  if (text.includes("da tarde") || text.includes("da noite") || text.includes("pm") || text.includes("p\.m") || text.includes("pm")) {
    if (hour < 12) hour += 12;
  } else if (text.includes("da manhã") || text.includes("am")) {
    if (hour === 12) hour = 0;
  }

  const days: number[] = [];
  const dayMap = DAY_MAPS[lang] ?? DAY_MAPS["pt-BR"];
  for (const [word, dayNum] of Object.entries(dayMap)) {
    if (text.includes(word)) {
      if (!days.includes(dayNum)) days.push(dayNum);
    }
  }
  if (text.includes("todo dia") || text.includes("todos os dias") || text.includes("diariamente")) {
    days.push(0, 1, 2, 3, 4, 5, 6);
  }
  if (text.includes("dia de semana") || text.includes("dias úteis") || text.includes("dias uteis") || text.includes("weekdays") || text.includes("dias laborables") ) {
    days.push(1, 2, 3, 4, 5);
  }
  if (text.includes("fim de semana") || text.includes("final de semana") || text.includes("weekend") || text.includes("fin de semana")) {
    days.push(0, 6);
  }

  let label = "";
  const labelMatch = text.match(/(?:chamado|com nome|called|named|llamado)\s+(.+?)(?:\s+(?:às|as|para|todo|segunda|terça|quarta|quinta|sexta|sábado|domingo|at|a las|\d)|$)/);
  if (labelMatch && labelMatch[1].length > 2) {
    label = labelMatch[1].trim();
  }

  if (days.length === 0) {
    days.push(new Date().getDay());
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