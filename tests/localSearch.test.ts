import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { matchRank, rankFoods, toLikePattern } from '../src/lib/localSearch.ts';

describe('toLikePattern', () => {
  it('escaped LIKE-Sonderzeichen', () => {
    assert.equal(toLikePattern('50%_a\\b'), '%50\\%\\_a\\\\b%');
  });

  it('ersetzt Umlaute durch Platzhalter, damit Groß-/Kleinschreibung egal ist', () => {
    assert.equal(toLikePattern(' Äpfel '), '%_pfel%');
  });
});

describe('matchRank', () => {
  it('bevorzugt Treffer am Wortanfang', () => {
    assert.equal(matchRank('Apfelmus', '', 'apf'), 0);
    assert.equal(matchRank('Bio Apfelmus', '', 'apf'), 1);
    assert.equal(matchRank('Grüner Apfel-Saft', '', 'saft'), 1);
    assert.equal(matchRank('Bratapfel', '', 'apf'), 2);
    assert.equal(matchRank('Joghurt', 'Müller Milch', 'milch'), 3);
    assert.equal(matchRank('Joghurt', 'Weihenstephan', 'steph'), 4);
    assert.equal(matchRank('Joghurt', 'Müller', 'käse'), null);
  });

  it('ignoriert Groß-/Kleinschreibung auch bei Umlauten', () => {
    assert.equal(matchRank('ÄPFEL', '', 'äpf'), 0);
    assert.equal(matchRank('Omas Linsensuppe', '', 'LINSEN'), 1);
  });
});

describe('rankFoods', () => {
  it('sortiert nach Rang, dann alphabetisch, und begrenzt die Anzahl', () => {
    const foods = [
      { name: 'Bratapfel', brand: '' },
      { name: 'Apfelsaft', brand: '' },
      { name: 'Bio Apfel', brand: '' },
      { name: 'Apfel', brand: '' },
      { name: 'Birne', brand: 'Apfelhof' },
    ];
    assert.deepEqual(
      rankFoods(foods, 'apfel', 4).map((f) => f.name),
      ['Apfel', 'Apfelsaft', 'Bio Apfel', 'Bratapfel'],
    );
  });
});
