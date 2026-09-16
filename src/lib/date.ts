// Datumsrechnung für die Tagesnavigation. Alles in lokaler Zeit: Ein Tag geht von 00:00 bis 23:59:59,
// und Tagesschritte laufen über die Kalenderfelder, damit Sommerzeitwechsel keinen Tag verschlucken.

import { localDateKey } from './format.ts';

export { localDateKey as dateKey };

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/** Liest einen Schlüssel wie „2026-09-16“ als lokalen Tagesbeginn; `null` bei ungültigem Text. */
export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  // Fängt Werte wie 2026-02-31 ab, die JavaScript sonst still weiterrechnet.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Tage addieren oder abziehen; das Ergebnis ist immer der Tagesbeginn. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function addMonths(date: Date, months: number): Date {
  // Tag 1 vermeidet Überläufe wie 31. Januar + 1 Monat.
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** „Heute“, „Gestern“, „Morgen“, sonst der Wochentag. */
export function dayTitle(date: Date, today: Date): string {
  if (isSameDay(date, today)) return 'Heute';
  if (isSameDay(date, addDays(today, -1))) return 'Gestern';
  if (isSameDay(date, addDays(today, 1))) return 'Morgen';
  return WEEKDAYS[date.getDay()];
}

/** „16. September“, in anderen Jahren mit Jahreszahl. */
export function dayDateLine(date: Date, today: Date): string {
  const base = `${date.getDate()}. ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

/** Vollständige Beschriftung für Screenreader und Kalender: „16. September 2026“. */
export function fullDateLabel(date: Date): string {
  return `${date.getDate()}. ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function monthLabel(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Datum des ausgewählten Tages mit der aktuellen Uhrzeit: So landet ein Eintrag auf dem gewählten Tag,
 * behält aber eine sinnvolle Uhrzeit für Sortierung und Mahlzeiten-Vorschlag.
 */
export function combineDayWithTime(day: Date, time: Date): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds(),
  );
}
