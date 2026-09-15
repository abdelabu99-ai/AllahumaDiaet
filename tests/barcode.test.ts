import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hasValidCheckDigit, normalizeBarcode } from '../src/lib/barcode.ts';

describe('hasValidCheckDigit', () => {
  it('akzeptiert gültige EAN-13 und EAN-8', () => {
    assert.equal(hasValidCheckDigit('4006381333931'), true);
    assert.equal(hasValidCheckDigit('96385074'), true);
  });

  it('lehnt Tippfehler ab', () => {
    assert.equal(hasValidCheckDigit('4006381333932'), false);
    assert.equal(hasValidCheckDigit('12345'), false);
  });
});

describe('normalizeBarcode', () => {
  it('lässt EAN-13 unverändert', () => {
    assert.equal(normalizeBarcode(' 4006381333931 '), '4006381333931');
  });

  it('macht aus UPC-A eine EAN-13', () => {
    assert.equal(normalizeBarcode('036000291452'), '0036000291452');
  });

  it('entfernt die führende Null einer GTIN-14', () => {
    assert.equal(normalizeBarcode('04006381333931'), '4006381333931');
  });

  it('liest GS1-Digital-Link-QR-Codes', () => {
    assert.equal(normalizeBarcode('https://id.gs1.org/01/04006381333931/10/ABC123'), '4006381333931');
    assert.equal(normalizeBarcode('https://example.com/01/04006381333931?x=1'), '4006381333931');
  });

  it('ignoriert QR-Codes ohne Produktnummer', () => {
    assert.equal(normalizeBarcode('https://example.com/gewinnspiel'), null);
    assert.equal(normalizeBarcode('4006381333932'), null);
  });
});
