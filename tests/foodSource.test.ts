import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chooseFoodSource, mayOverwriteWithRemote } from '../src/lib/foodSource.ts';

describe('chooseFoodSource', () => {
  it('bevorzugt lokale Daten, auch wenn Open Food Facts etwas liefert', () => {
    assert.equal(chooseFoodSource({ local: { userEdited: false }, remote: 'found' }), 'local');
    assert.equal(chooseFoodSource({ local: { userEdited: true }, remote: 'found' }), 'local');
  });

  it('nutzt Open Food Facts nur ohne lokalen Datensatz', () => {
    assert.equal(chooseFoodSource({ local: null, remote: 'found' }), 'remote');
  });

  it('führt ins manuelle Formular, wenn nichts Vollständiges vorliegt', () => {
    assert.equal(chooseFoodSource({ local: null, remote: 'incomplete' }), 'manual');
    assert.equal(chooseFoodSource({ local: null, remote: 'missing' }), 'manual');
  });
});

describe('mayOverwriteWithRemote', () => {
  it('schützt vom Nutzer korrigierte Werte', () => {
    assert.equal(mayOverwriteWithRemote({ userEdited: true }), false);
  });

  it('erlaubt das Aktualisieren unveränderter und neuer Produkte', () => {
    assert.equal(mayOverwriteWithRemote({ userEdited: false }), true);
    assert.equal(mayOverwriteWithRemote(null), true);
  });
});
