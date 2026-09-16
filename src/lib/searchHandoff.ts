// Übergibt ausgewählte Online-Suchtreffer an den Produkt-Screen, ohne sie vorab in die Datenbank zu
// schreiben und ohne eine zweite Anfrage an Open Food Facts. Lebt nur im Arbeitsspeicher.

import type { SearchHit } from './openFoodFacts.ts';

const MAX_ENTRIES = 200;
const hits = new Map<string, SearchHit>();

export function rememberSearchHit(key: string, hit: SearchHit): void {
  hits.delete(key);
  hits.set(key, hit);
  // Älteste Einträge verwerfen, damit „Mehr laden“ den Speicher nicht unbegrenzt füllt.
  while (hits.size > MAX_ENTRIES) {
    const oldest = hits.keys().next().value;
    if (oldest === undefined) break;
    hits.delete(oldest);
  }
}

export function getSearchHit(key: string): SearchHit | undefined {
  return hits.get(key);
}
