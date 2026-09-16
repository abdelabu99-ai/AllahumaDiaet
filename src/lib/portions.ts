// Schnellauswahl für Mengen, gemeinsam genutzt von Produkt-Screen und Eintrag-Bearbeitung.

import { formatDecimal } from './format.ts';

export const MAX_PORTION_G = 5000;

export type PortionPreset = { label: string; grams: number };

export function portionPresets(servingSizeG: number | null): PortionPreset[] {
  return [
    ...(servingSizeG && servingSizeG > 0 ? [{ label: `1 Packung (${formatDecimal(servingSizeG)} g)`, grams: servingSizeG }] : []),
    { label: '100 g', grams: 100 },
    { label: '1 Esslöffel (15 g)', grams: 15 },
    { label: '1 Teelöffel (5 g)', grams: 5 },
  ];
}

/** Gültige Menge in Gramm oder `null`. */
export function validPortionGrams(grams: number | null): number | null {
  return grams !== null && Number.isFinite(grams) && grams > 0 && grams <= MAX_PORTION_G ? grams : null;
}
