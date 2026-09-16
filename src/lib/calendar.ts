// Monatsraster für den Kalender: 7 Spalten, Montag zuerst, Tage anderer Monate bleiben leer.

import { startOfMonth } from './date.ts';

export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Wochentag als Index mit Montag = 0. */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Wochenzeilen eines Monats. Jede Zeile hat 7 Einträge; `null` steht für einen Tag,
 * der zum Vor- oder Folgemonat gehört.
 */
export function monthMatrix(monthDate: Date): (Date | null)[][] {
  const first = startOfMonth(monthDate);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const leading = mondayIndex(first);

  const cells: (Date | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
