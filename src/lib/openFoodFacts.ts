// Anbindung an die Open Food Facts API (https://openfoodfacts.github.io/openfoodfacts-server/api/).
// Daten stehen unter der Open Database License (ODbL) und müssen in der App genannt werden.

const API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = [
  'product_name',
  'product_name_de',
  'brands',
  'nutriments',
  'product_quantity',
  'product_quantity_unit',
  'image_front_small_url',
].join(',');
const TIMEOUT_MS = 8000;
const KJ_PER_KCAL = 4.184;

export type ProductData = {
  barcode: string;
  name: string;
  brand: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingSizeG: number | null;
  imageUrl: string | null;
};

/** Was trotz fehlender Nährwerte schon bekannt ist, um das manuelle Formular vorzubefüllen. */
export type PartialProduct = Pick<ProductData, 'barcode' | 'name' | 'brand' | 'servingSizeG' | 'imageUrl'>;

export type LookupResult =
  | { status: 'found'; product: ProductData }
  | { status: 'incomplete'; partial: PartialProduct }
  | { status: 'not_found' }
  | { status: 'error' };

type RawProduct = {
  product_name?: unknown;
  product_name_de?: unknown;
  brands?: unknown;
  nutriments?: Record<string, unknown>;
  product_quantity?: unknown;
  product_quantity_unit?: unknown;
  image_front_small_url?: unknown;
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseProduct(barcode: string, raw: RawProduct): LookupResult {
  const n = raw.nutriments ?? {};

  const kcal =
    toNumber(n['energy-kcal_100g']) ??
    (() => {
      const kj = toNumber(n['energy-kj_100g']) ?? toNumber(n['energy_100g']);
      return kj === null ? null : kj / KJ_PER_KCAL;
    })();
  const protein = toNumber(n['proteins_100g']);
  const carbs = toNumber(n['carbohydrates_100g']);
  const fat = toNumber(n['fat_100g']);

  const unit = toText(raw.product_quantity_unit).toLowerCase();
  const quantity = toNumber(raw.product_quantity);
  const servingSizeG = quantity !== null && quantity > 0 && (unit === '' || unit === 'g' || unit === 'ml') ? quantity : null;

  const imageUrl = toText(raw.image_front_small_url) || null;
  const partial: PartialProduct = {
    barcode,
    name: toText(raw.product_name_de) || toText(raw.product_name),
    brand: toText(raw.brands).split(',')[0].trim(),
    servingSizeG,
    imageUrl,
  };

  if (kcal === null || protein === null || carbs === null || fat === null) {
    return { status: 'incomplete', partial };
  }

  return {
    status: 'found',
    product: {
      ...partial,
      name: partial.name || 'Unbenanntes Produkt',
      caloriesPer100g: Math.round(kcal),
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
    },
  };
}

/** Open Food Facts bittet um einen eindeutigen User-Agent mit Kontaktmöglichkeit, z. B. `HALABI/1.0.0 (mail@example.com)`. */
export function buildUserAgent(appName: string, appVersion: string, contactEmail: string): string {
  return `${appName}/${appVersion} (${contactEmail})`;
}

export async function fetchProduct(barcode: string, userAgent: string): Promise<LookupResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${API_BASE}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
      signal: controller.signal,
    });

    // Unbekannte Codes beantwortet die API mit 404 und status 0.
    if (response.status === 404) return { status: 'not_found' };
    if (!response.ok) return { status: 'error' };

    const json = (await response.json()) as { status?: number; product?: RawProduct };
    if (json.status !== 1 || !json.product) return { status: 'not_found' };

    return parseProduct(barcode, json.product);
  } catch {
    return { status: 'error' };
  } finally {
    clearTimeout(timeout);
  }
}
