import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildUserAgent, parseProduct } from '../src/lib/openFoodFacts.ts';

describe('buildUserAgent', () => {
  it('nennt App, Version und Kontakt', () => {
    assert.equal(buildUserAgent('HALABI', '1.0.0', 'kontakt@example.com'), 'HALABI/1.0.0 (kontakt@example.com)');
  });
});

describe('parseProduct', () => {
  it('liest vollständige Produkte', () => {
    const result = parseProduct('4000000000000', {
      product_name: 'Skyr',
      product_name_de: 'Skyr Natur',
      brands: 'Milbona, Lidl',
      product_quantity: '500',
      product_quantity_unit: 'g',
      image_front_small_url: 'https://images.openfoodfacts.org/x.jpg',
      nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2 },
    });

    assert.deepEqual(result, {
      status: 'found',
      product: {
        barcode: '4000000000000',
        name: 'Skyr Natur',
        brand: 'Milbona',
        servingSizeG: 500,
        imageUrl: 'https://images.openfoodfacts.org/x.jpg',
        caloriesPer100g: 63,
        proteinPer100g: 11,
        carbsPer100g: 4,
        fatPer100g: 0.2,
      },
    });
  });

  it('rechnet kJ in kcal um, wenn kcal fehlen', () => {
    const result = parseProduct('1', {
      product_name: 'Haferflocken',
      nutriments: { 'energy-kj_100g': 1548, proteins_100g: 13.5, carbohydrates_100g: 58.7, fat_100g: 7 },
    });
    assert.equal(result.status, 'found');
    assert.equal(result.status === 'found' && result.product.caloriesPer100g, 370);
  });

  it('meldet fehlende Nährwerte als unvollständig und behält den Namen', () => {
    const result = parseProduct('2', {
      product_name: 'Unbekannter Riegel',
      brands: 'Marke',
      nutriments: { 'energy-kcal_100g': 400 },
    });
    assert.deepEqual(result, {
      status: 'incomplete',
      partial: { barcode: '2', name: 'Unbekannter Riegel', brand: 'Marke', servingSizeG: null, imageUrl: null },
    });
  });

  it('ignoriert Packungsgrößen in anderen Einheiten als g oder ml', () => {
    const result = parseProduct('3', {
      product_name: 'Eier',
      product_quantity: 10,
      product_quantity_unit: 'Stück',
      nutriments: { 'energy-kcal_100g': 137, proteins_100g: 12.9, carbohydrates_100g: 1.1, fat_100g: 9.3 },
    });
    assert.equal(result.status === 'found' && result.product.servingSizeG, null);
  });
});
