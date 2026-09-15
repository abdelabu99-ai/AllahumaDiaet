import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { draftFromPer100g, draftToPer100g, EMPTY_DRAFT, isUsablePortion, parseDraft } from '../src/lib/nutritionDraft.ts';

const skyr = { calories: 63, protein: 11, carbs: 4, fat: 0.2 };

describe('nutritionDraft', () => {
  it('zeigt Werte pro 100 g mit Komma', () => {
    assert.deepEqual(draftFromPer100g(skyr, 'per100g', null), { calories: '63', protein: '11', carbs: '4', fat: '0,2' });
  });

  it('zeigt Werte pro Portion', () => {
    assert.deepEqual(draftFromPer100g(skyr, 'portion', 250), { calories: '158', protein: '27,5', carbs: '10', fat: '0,5' });
  });

  it('fällt ohne Portionsgröße auf pro 100 g zurück', () => {
    assert.deepEqual(draftFromPer100g(skyr, 'portion', null), draftFromPer100g(skyr, 'per100g', null));
  });

  it('liest vollständige Felder und lehnt unvollständige ab', () => {
    assert.deepEqual(parseDraft({ calories: '63', protein: '11', carbs: '4', fat: '0,2' }), skyr);
    assert.equal(parseDraft({ ...EMPTY_DRAFT, calories: '63' }), null);
  });

  it('rechnet Portionswerte auf 100 g um', () => {
    assert.deepEqual(draftToPer100g({ calories: '50', protein: '5', carbs: '2,5', fat: '1' }, 'portion', 50), {
      calories: 100,
      protein: 10,
      carbs: 5,
      fat: 2,
    });
    assert.equal(draftToPer100g({ calories: '50', protein: '5', carbs: '2,5', fat: '1' }, 'portion', 0), null);
  });

  it('prüft Portionsgrößen', () => {
    assert.equal(isUsablePortion(30), true);
    assert.equal(isUsablePortion(0), false);
    assert.equal(isUsablePortion(null), false);
  });
});
