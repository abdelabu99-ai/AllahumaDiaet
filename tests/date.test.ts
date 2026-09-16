import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addDays,
  addMonths,
  combineDayWithTime,
  dateKey,
  dayDateLine,
  dayTitle,
  endOfDay,
  endOfMonth,
  fullDateLabel,
  isSameDay,
  monthLabel,
  parseDateKey,
  startOfDay,
  startOfMonth,
} from '../src/lib/date.ts';

const d = (y: number, m: number, day: number, h = 0, min = 0) => new Date(y, m - 1, day, h, min);

describe('Tagesgrenzen', () => {
  it('startOfDay und endOfDay bleiben am selben Tag', () => {
    assert.equal(startOfDay(d(2026, 9, 16, 13, 45)).getHours(), 0);
    const end = endOfDay(d(2026, 9, 16, 13, 45));
    assert.equal(end.getHours(), 23);
    assert.equal(end.getMinutes(), 59);
    assert.equal(end.getDate(), 16);
  });
});

describe('addDays', () => {
  it('wechselt Monat und Jahr', () => {
    assert.equal(dateKey(addDays(d(2026, 1, 31), 1)), '2026-02-01');
    assert.equal(dateKey(addDays(d(2026, 12, 31), 1)), '2027-01-01');
    assert.equal(dateKey(addDays(d(2027, 1, 1), -1)), '2026-12-31');
  });

  it('kennt Schaltjahre', () => {
    assert.equal(dateKey(addDays(d(2024, 2, 28), 1)), '2024-02-29');
    assert.equal(dateKey(addDays(d(2024, 2, 29), 1)), '2024-03-01');
    assert.equal(dateKey(addDays(d(2026, 2, 28), 1)), '2026-03-01');
  });

  it('übersteht die Sommerzeitumstellung ohne Tagessprung', () => {
    // In Europa/Berlin beginnt die Sommerzeit am 29.03.2026 und endet am 25.10.2026.
    assert.equal(dateKey(addDays(d(2026, 3, 28), 1)), '2026-03-29');
    assert.equal(dateKey(addDays(d(2026, 3, 29), 1)), '2026-03-30');
    assert.equal(dateKey(addDays(d(2026, 10, 24), 1)), '2026-10-25');
    assert.equal(dateKey(addDays(d(2026, 10, 25), 1)), '2026-10-26');
    for (const day of [d(2026, 3, 29), d(2026, 10, 25)]) {
      assert.equal(dateKey(startOfDay(day)), dateKey(day));
    }
  });
});

describe('Monate', () => {
  it('startOfMonth, endOfMonth und addMonths', () => {
    assert.equal(dateKey(startOfMonth(d(2026, 9, 16))), '2026-09-01');
    assert.equal(dateKey(endOfMonth(d(2026, 9, 16))), '2026-09-30');
    assert.equal(dateKey(endOfMonth(d(2024, 2, 5))), '2024-02-29');
    assert.equal(dateKey(addMonths(d(2026, 1, 31), 1)), '2026-02-01');
    assert.equal(dateKey(addMonths(d(2026, 1, 15), -1)), '2025-12-01');
  });
});

describe('Beschriftungen', () => {
  const today = d(2026, 9, 16);

  it('nennt Heute, Gestern und Morgen', () => {
    assert.equal(dayTitle(today, today), 'Heute');
    assert.equal(dayTitle(d(2026, 9, 15), today), 'Gestern');
    assert.equal(dayTitle(d(2026, 9, 17), today), 'Morgen');
    assert.equal(dayTitle(d(2026, 9, 12), today), 'Samstag');
  });

  it('zeigt das Jahr nur bei anderen Jahren', () => {
    assert.equal(dayDateLine(d(2026, 9, 16), today), '16. September');
    assert.equal(dayDateLine(d(2025, 12, 24), today), '24. Dezember 2025');
    assert.equal(fullDateLabel(d(2026, 9, 16)), '16. September 2026');
    assert.equal(monthLabel(d(2026, 9, 1)), 'September 2026');
  });
});

describe('parseDateKey', () => {
  it('liest gültige Schlüssel als lokalen Tagesbeginn', () => {
    const parsed = parseDateKey('2026-09-16');
    assert.ok(parsed);
    assert.equal(dateKey(parsed), '2026-09-16');
    assert.equal(parsed.getHours(), 0);
  });

  it('lehnt ungültige Angaben ab', () => {
    assert.equal(parseDateKey('2026-02-31'), null);
    assert.equal(parseDateKey('16.09.2026'), null);
    assert.equal(parseDateKey(''), null);
  });
});

describe('isSameDay und combineDayWithTime', () => {
  it('vergleicht nur das Kalenderdatum', () => {
    assert.equal(isSameDay(d(2026, 9, 16, 0, 1), d(2026, 9, 16, 23, 59)), true);
    assert.equal(isSameDay(d(2026, 9, 16), d(2026, 9, 17)), false);
  });

  it('setzt die aktuelle Uhrzeit auf den ausgewählten Tag', () => {
    const combined = combineDayWithTime(d(2026, 9, 14), d(2026, 9, 16, 19, 30));
    assert.equal(dateKey(combined), '2026-09-14');
    assert.equal(combined.getHours(), 19);
    assert.equal(combined.getMinutes(), 30);
  });
});
