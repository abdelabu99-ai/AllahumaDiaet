// Suche im lokalen Lebensmittelkatalog. SQLite vergleicht Groß-/Kleinschreibung nur für ASCII,
// daher filtert die Datenbank grob vor und diese Funktionen entscheiden exakt und sortieren.

export const MIN_LOCAL_QUERY_LENGTH = 2;

const WORD_SEPARATORS = /[\s\-_,.;:/()&+'"!?]+/;

function normalize(text: string): string {
  return text.normalize('NFC').toLocaleLowerCase('de-DE').trim();
}

/**
 * LIKE-Muster für die Vorauswahl in SQLite: Sonderzeichen werden escaped (ESCAPE '\'),
 * Nicht-ASCII-Zeichen durch `_` ersetzt, damit z. B. „Äpfel“ auch „äpfel“ findet.
 */
export function toLikePattern(query: string): string {
  const escaped = query
    .trim()
    .replace(/[\\%_]/g, (c) => `\\${c}`)
    .replace(/[^\x00-\x7F]/g, '_');
  return `%${escaped}%`;
}

/**
 * Rang eines Treffers, kleiner ist besser; `null` = kein Treffer.
 * 0: Name beginnt mit der Suche · 1: ein Wort im Namen beginnt damit · 2: Name enthält sie
 * 3: ein Wort der Marke beginnt damit · 4: Marke enthält sie
 */
export function matchRank(name: string, brand: string, query: string): number | null {
  const q = normalize(query);
  if (q.length === 0) return null;
  const n = normalize(name);
  const b = normalize(brand);

  if (n.startsWith(q)) return 0;
  if (n.split(WORD_SEPARATORS).some((word) => word.startsWith(q))) return 1;
  if (n.includes(q)) return 2;
  if (b.split(WORD_SEPARATORS).some((word) => word.startsWith(q))) return 3;
  if (b.includes(q)) return 4;
  return null;
}

export function rankFoods<T extends { name: string; brand: string }>(items: T[], query: string, limit: number): T[] {
  return items
    .map((item) => ({ item, rank: matchRank(item.name, item.brand, query) }))
    .filter((entry): entry is { item: T; rank: number } => entry.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name, 'de'))
    .slice(0, limit)
    .map((entry) => entry.item);
}
