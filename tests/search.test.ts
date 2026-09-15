import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSearchUrl, escapeLuceneQuery, parseRetryAfter, parseSearchResults, SEARCH_PAGE_SIZE } from '../src/lib/openFoodFacts.ts';
import { createRateLimiter } from '../src/lib/rateLimiter.ts';

// Gekürzte echte Antwort von search.openfoodfacts.org (Stand 15.09.2026) plus konstruierte Randfälle.
const sampleResponse = {
  hits: [
    {
      code: '4337185761638',
      product_name: 'Skyr natur',
      product_name_de: 'Skyr natur',
      brands: ['K-Classic', 'Kaufland'],
      nutriments: { 'energy-kcal_100g': 64, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2 },
      image_front_small_url: 'https://images.openfoodfacts.org/images/products/433/718/576/1638/front_de.3.200.jpg',
    },
    {
      code: '5690845001987',
      product_name: 'Skyr Moka',
      brands: ['Skyr', 'Isey Skyr'],
      nutriments: { 'energy-kcal_100g': 79 },
    },
    // Doppelter Barcode, kein gültiger Code, UPC-A ohne führende Null
    { code: '4337185761638', product_name: 'Duplikat', nutriments: {} },
    { code: 'abc', product_name: 'Ungültig' },
    { code: '036000291452', product_name: 'Import', brands: [], nutriments: { 'energy-kcal_100g': 1, proteins_100g: 0, carbohydrates_100g: 0, fat_100g: 0 } },
  ],
  count: 300,
  page: 1,
  page_count: 15,
  page_size: 20,
};

describe('parseSearchResults', () => {
  it('nutzt parseProduct pro Treffer und liefert Seiteninfos', () => {
    const page = parseSearchResults(sampleResponse);
    assert.equal(page.count, 300);
    assert.equal(page.page, 1);
    assert.equal(page.pageCount, 15);
    assert.equal(page.hits.length, 3);

    const [skyr, moka, upc] = page.hits;
    assert.equal(skyr.status, 'found');
    assert.deepEqual(skyr.status === 'found' && skyr.product, {
      barcode: '4337185761638',
      name: 'Skyr natur',
      brand: 'K-Classic',
      caloriesPer100g: 64,
      proteinPer100g: 11,
      carbsPer100g: 4,
      fatPer100g: 0.2,
      servingSizeG: null,
      imageUrl: 'https://images.openfoodfacts.org/images/products/433/718/576/1638/front_de.3.200.jpg',
    });

    assert.equal(moka.status, 'incomplete');
    assert.equal(moka.status === 'incomplete' && moka.partial.brand, 'Skyr');

    assert.equal(upc.status === 'found' && upc.product.barcode, '0036000291452');
  });

  it('verkraftet leere oder kaputte Antworten', () => {
    assert.deepEqual(parseSearchResults({ hits: [], count: 0, page: 1, page_count: 0 }), { hits: [], count: 0, page: 1, pageCount: 0 });
    assert.deepEqual(parseSearchResults(null), { hits: [], count: 0, page: 1, pageCount: 1 });
  });
});

describe('Suchanfrage', () => {
  it('maskiert Lucene-Sonderzeichen', () => {
    assert.equal(escapeLuceneQuery('  Milch (3,5 %)  '), 'Milch \\(3,5 %\\)');
    assert.equal(escapeLuceneQuery('a:b "c" -d'), 'a\\:b \\"c\\" \\-d');
  });

  it('baut die URL mit Länderfilter, Seitengröße und Feldern', () => {
    const url = new URL(buildSearchUrl({ query: 'skyr', page: 2, germanyOnly: true }));
    assert.equal(url.origin + url.pathname, 'https://search.openfoodfacts.org/search');
    assert.equal(url.searchParams.get('q'), 'skyr countries_tags:"en:germany"');
    assert.equal(url.searchParams.get('page'), '2');
    assert.equal(url.searchParams.get('page_size'), String(SEARCH_PAGE_SIZE));
    assert.equal(url.searchParams.get('langs'), 'de,en');
    assert.match(url.searchParams.get('fields') ?? '', /nutriments/);

    const world = new URL(buildSearchUrl({ query: 'skyr', page: 1, germanyOnly: false }));
    assert.equal(world.searchParams.get('q'), 'skyr');
  });

  it('liest Retry-After in Sekunden', () => {
    assert.equal(parseRetryAfter('30'), 30);
    assert.equal(parseRetryAfter('2.2'), 3);
    assert.equal(parseRetryAfter(null), null);
    assert.equal(parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT'), null);
  });
});

describe('createRateLimiter', () => {
  it('erlaubt höchstens limit Anfragen im Zeitfenster', () => {
    const limiter = createRateLimiter(2, 60_000);
    assert.deepEqual(limiter.tryAcquire(0), { ok: true });
    assert.deepEqual(limiter.tryAcquire(1_000), { ok: true });
    assert.deepEqual(limiter.tryAcquire(2_000), { ok: false, retryAfterMs: 58_000 });
    // Nach Ablauf der ersten Anfrage ist wieder Platz.
    assert.deepEqual(limiter.tryAcquire(60_000), { ok: true });
    assert.deepEqual(limiter.tryAcquire(60_500), { ok: false, retryAfterMs: 500 });
  });
});
