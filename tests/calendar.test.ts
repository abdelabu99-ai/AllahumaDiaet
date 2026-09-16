import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mondayIndex, monthMatrix, WEEKDAY_LABELS } from '../src/lib/calendar.ts';
import { dateKey } from '../src/lib/date.ts';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const shape = (weeks: (Date | null)[][]) => weeks.map((week) => week.map((day) => day?.getDate() ?? null));

describe('monthMatrix', () => {
  it('beginnt die Woche montags', () => {
    assert.deepEqual(WEEKDAY_LABELS, ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
    assert.equal(mondayIndex(d(2026, 9, 14)), 0); // Montag
    assert.equal(mondayIndex(d(2026, 9, 20)), 6); // Sonntag
  });

  it('füllt September 2026 (beginnt Dienstag, 30 Tage)', () => {
    const weeks = monthMatrix(d(2026, 9, 16));
    assert.deepEqual(shape(weeks)[0], [null, 1, 2, 3, 4, 5, 6]);
    assert.deepEqual(shape(weeks).at(-1), [28, 29, 30, null, null, null, null]);
    assert.ok(weeks.every((week) => week.length === 7));
    assert.equal(weeks.flat().filter(Boolean).length, 30);
  });

  it('füllt einen Monat, der an einem Sonntag beginnt (Februar 2026, 28 Tage)', () => {
    const weeks = monthMatrix(d(2026, 2, 10));
    assert.deepEqual(shape(weeks)[0], [null, null, null, null, null, null, 1]);
    assert.equal(weeks.flat().filter(Boolean).length, 28);
  });

  it('kennt Schaltjahre und Monate mit 30 oder 31 Tagen', () => {
    assert.equal(monthMatrix(d(2024, 2, 1)).flat().filter(Boolean).length, 29);
    assert.equal(monthMatrix(d(2026, 1, 1)).flat().filter(Boolean).length, 31);
    assert.equal(monthMatrix(d(2026, 4, 1)).flat().filter(Boolean).length, 30);
  });

  it('liefert höchstens sechs Wochen und behält die Reihenfolge', () => {
    for (const month of [d(2026, 1, 1), d(2026, 2, 1), d(2024, 2, 1), d(2026, 8, 1), d(2026, 11, 1)]) {
      const weeks = monthMatrix(month);
      assert.ok(weeks.length <= 6, `${dateKey(month)} hat ${weeks.length} Wochen`);
      const days = weeks.flat().filter((day): day is Date => day !== null);
      assert.ok(days.every((day, i) => i === 0 || days[i - 1].getDate() + 1 === day.getDate()));
    }
  });
});
