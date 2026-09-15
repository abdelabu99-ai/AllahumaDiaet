// Anbindung an die Open Food Facts API (https://openfoodfacts.github.io/openfoodfacts-server/api/).
// Daten stehen unter der Open Database License (ODbL) und müssen in der App genannt werden.

import { normalizeBarcode } from './barcode.ts';

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

/** Die Produkt-API liefert Marken als Text („A, B“), die Suche als Liste. */
function firstBrand(value: unknown): string {
  const list = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : toText(value).split(',');
  return (list[0] ?? '').trim();
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
    brand: firstBrand(raw.brands),
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

/** Open Food Facts verlangt einen eindeutigen User-Agent im Format `AppName/Version (Kontakt-E-Mail)`. */
export function buildUserAgent(appName: string, appVersion: string, contactEmail: string): string {
  return `${appName}/${appVersion} (${contactEmail})`;
}

// ---------- Textsuche ----------
//
// Volltextsuche gibt es nur über Search-a-licious (https://search.openfoodfacts.org), die von Open Food Facts
// empfohlene Such-API; /api/v2/search kann keine Volltextsuche und /cgi/search.pl gilt als veraltet.
// Für Suchanfragen dokumentiert Open Food Facts ein Limit von 10 Anfragen pro Minute je IP-Adresse und rät
// ausdrücklich von Suche beim Tippen ab. Die App sucht deshalb nur beim Absenden (siehe SEARCH_RATE_LIMIT).

const SEARCH_BASE = 'https://search.openfoodfacts.org/search';
const SEARCH_TIMEOUT_MS = 10000;

export const SEARCH_PAGE_SIZE = 20;
/** Bewusst unter dem dokumentierten Limit von 10 Anfragen pro Minute. */
export const SEARCH_RATE_LIMIT = { limit: 8, windowMs: 60_000 } as const;

const SEARCH_FIELDS = ['code', 'product_name', 'product_name_de', 'brands', 'nutriments', 'product_quantity', 'product_quantity_unit', 'image_front_small_url'].join(',');

export type SearchHit =
  | { status: 'found'; product: ProductData }
  | { status: 'incomplete'; partial: PartialProduct };

export type SearchPage = { hits: SearchHit[]; count: number; page: number; pageCount: number };

export type SearchResult =
  | { status: 'ok'; page: SearchPage }
  | { status: 'rate_limited'; retryAfterSeconds: number | null }
  | { status: 'timeout' }
  | { status: 'offline' }
  | { status: 'unavailable' };

export const hitKey = (hit: SearchHit) => (hit.status === 'found' ? hit.product.barcode : hit.partial.barcode);

/** Maskiert Lucene-Sonderzeichen, damit Eingaben wie „Milch (3,5 %)“ keine Syntaxfehler auslösen. */
export function escapeLuceneQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[+\-!(){}[\]^"~*?:\\/&|]/g, (c) => `\\${c}`);
}

export function buildSearchUrl(options: { query: string; page: number; germanyOnly: boolean; pageSize?: number }): string {
  const text = escapeLuceneQuery(options.query);
  // Deutsche Produkte bevorzugen: zuerst mit Länderfilter, bei null Treffern weltweit (siehe searchProducts).
  const q = options.germanyOnly ? `${text} countries_tags:"en:germany"` : text;
  const params = [
    `q=${encodeURIComponent(q)}`,
    'langs=de,en',
    `page_size=${options.pageSize ?? SEARCH_PAGE_SIZE}`,
    `page=${options.page}`,
    `fields=${SEARCH_FIELDS}`,
  ];
  return `${SEARCH_BASE}?${params.join('&')}`;
}

type RawSearchResponse = {
  hits?: unknown;
  count?: unknown;
  page?: unknown;
  page_count?: unknown;
};

/** Wandelt eine Search-a-licious-Antwort um; nutzt pro Treffer parseProduct. Treffer ohne gültigen Barcode entfallen. */
export function parseSearchResults(json: unknown): SearchPage {
  const data = (json && typeof json === 'object' ? json : {}) as RawSearchResponse;
  const rawHits = Array.isArray(data.hits) ? data.hits : [];
  const seen = new Set<string>();
  const hits: SearchHit[] = [];

  for (const raw of rawHits) {
    if (!raw || typeof raw !== 'object') continue;
    const product = raw as RawProduct & { code?: unknown };
    const barcode = normalizeBarcode(toText(product.code));
    if (!barcode || seen.has(barcode)) continue;
    seen.add(barcode);

    const result = parseProduct(barcode, product);
    if (result.status === 'found' || result.status === 'incomplete') hits.push(result);
  }

  return {
    hits,
    count: toNumber(data.count) ?? hits.length,
    page: toNumber(data.page) ?? 1,
    pageCount: toNumber(data.page_count) ?? 1,
  };
}

export function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : null;
}

async function requestSearchPage(url: string, userAgent: string): Promise<SearchResult> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' }, signal: controller.signal });
    if (response.status === 429) return { status: 'rate_limited', retryAfterSeconds: parseRetryAfter(response.headers.get('Retry-After')) };
    if (!response.ok) return { status: 'unavailable' };

    const json = await response.json();
    // Fehler der Suchmaschine kommen mit Status 200 und einem errors-Feld.
    if (json && typeof json === 'object' && 'errors' in json && !('hits' in json)) return { status: 'unavailable' };
    return { status: 'ok', page: parseSearchResults(json) };
  } catch {
    return timedOut ? { status: 'timeout' } : { status: 'offline' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sucht bei Open Food Facts. Bevorzugt Produkte aus Deutschland: Auf Seite 1 ohne Treffer wird einmal
 * weltweit gesucht. `scope` sagt, welche Suche die Ergebnisse geliefert hat (für „Mehr laden“).
 * `acquire` prüft das Rate Limit vor jeder einzelnen Anfrage.
 */
export async function searchProducts(
  options: { query: string; page: number; scope: 'germany' | 'world' },
  userAgent: string,
  acquire: () => { ok: true } | { ok: false; retryAfterMs: number },
): Promise<{ result: SearchResult; scope: 'germany' | 'world' }> {
  const run = async (scope: 'germany' | 'world'): Promise<SearchResult> => {
    const permit = acquire();
    if (!permit.ok) return { status: 'rate_limited', retryAfterSeconds: Math.ceil(permit.retryAfterMs / 1000) };
    return requestSearchPage(buildSearchUrl({ query: options.query, page: options.page, germanyOnly: scope === 'germany' }), userAgent);
  };

  const first = await run(options.scope);
  if (options.scope === 'germany' && options.page === 1 && first.status === 'ok' && first.page.hits.length === 0) {
    return { result: await run('world'), scope: 'world' };
  }
  return { result: first, scope: options.scope };
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
