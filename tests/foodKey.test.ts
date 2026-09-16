import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isCustomFoodKey, isValidFoodKey, newCustomFoodKey, parseFoodKey } from '../src/lib/foodKey.ts';

const UUID = '3f2a9c1e-7b4d-4e8a-9f10-2c6d5e7a8b90';

describe('foodKey', () => {
  it('erkennt eigene Schlüssel', () => {
    assert.equal(isCustomFoodKey(`custom:${UUID}`), true);
    assert.equal(isCustomFoodKey('custom:apfel'), false);
    assert.equal(isCustomFoodKey('4006381333931'), false);
  });

  it('erzeugt eigene Schlüssel aus einer UUID', () => {
    assert.equal(newCustomFoodKey(UUID.toUpperCase()), `custom:${UUID}`);
    assert.throws(() => newCustomFoodKey('keine-uuid'));
  });

  it('akzeptiert normalisierte Barcodes und eigene Schlüssel', () => {
    assert.equal(isValidFoodKey('4006381333931'), true);
    assert.equal(isValidFoodKey(`custom:${UUID}`), true);
    // Nicht normalisiert (UPC-A ohne führende Null) oder falsche Prüfziffer
    assert.equal(isValidFoodKey('036000291452'), false);
    assert.equal(isValidFoodKey('4006381333932'), false);
    assert.equal(isValidFoodKey(''), false);
  });

  it('liest Schlüssel aus Routen-Parametern', () => {
    assert.equal(parseFoodKey(`custom:${UUID}`), `custom:${UUID}`);
    assert.equal(parseFoodKey('036000291452'), '0036000291452');
    assert.equal(parseFoodKey('custom:'), null);
    assert.equal(parseFoodKey('hallo'), null);
  });
});
