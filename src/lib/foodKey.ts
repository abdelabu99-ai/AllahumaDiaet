// Schlüssel für food_item.barcode: echte GTINs oder `custom:<uuid>` für Lebensmittel ohne Barcode.

import { normalizeBarcode } from './barcode.ts';

export const CUSTOM_FOOD_PREFIX = 'custom:';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCustomFoodKey(key: string): boolean {
  return key.startsWith(CUSTOM_FOOD_PREFIX) && UUID_PATTERN.test(key.slice(CUSTOM_FOOD_PREFIX.length));
}

/** Gültig sind eigene Schlüssel und bereits normalisierte Barcodes (so, wie sie in der Datenbank stehen). */
export function isValidFoodKey(key: string): boolean {
  return isCustomFoodKey(key) || normalizeBarcode(key) === key;
}

/** @param uuid z. B. aus `randomUUID()` von expo-crypto – so bleibt diese Datei ohne React-Native-Abhängigkeit. */
export function newCustomFoodKey(uuid: string): string {
  const key = `${CUSTOM_FOOD_PREFIX}${uuid.toLowerCase()}`;
  if (!isCustomFoodKey(key)) throw new Error(`Ungültige UUID: ${uuid}`);
  return key;
}

/** Liest einen Schlüssel aus einer Route: eigener Schlüssel unverändert, Barcodes normalisiert, sonst `null`. */
export function parseFoodKey(raw: string): string | null {
  const value = raw.trim();
  if (isCustomFoodKey(value)) return value.toLowerCase();
  return normalizeBarcode(value);
}
