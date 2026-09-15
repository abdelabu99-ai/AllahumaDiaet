// Wandelt gescannte oder eingetippte Codes in eine einheitliche GTIN um,
// damit derselbe Artikel lokal immer unter demselben Schlüssel liegt.

const GTIN_LENGTHS = new Set([8, 12, 13, 14]);

export function hasValidCheckDigit(code: string): boolean {
  if (!/^\d+$/.test(code) || !GTIN_LENGTHS.has(code.length)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  // Von rechts gewichtet: 3, 1, 3, 1, ...
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

function canonicalGtin(code: string): string {
  // UPC-A (12) und GTIN-14 mit führender Null auf EAN-13 bringen.
  if (code.length === 12) return `0${code}`;
  if (code.length === 14 && code.startsWith('0')) return code.slice(1);
  return code;
}

/**
 * Liefert die normalisierte GTIN oder `null`, wenn der Inhalt kein Produktcode ist.
 * Unterstützt reine Ziffern-Codes und QR-Codes im GS1-Digital-Link-Format
 * (z. B. https://id.gs1.org/01/04012345678901).
 */
export function normalizeBarcode(raw: string): string | null {
  const value = raw.trim();

  if (/^\d+$/.test(value)) {
    return hasValidCheckDigit(value) ? canonicalGtin(value) : null;
  }

  const digitalLink = value.match(/\/01\/(\d{14})(?:[/?#]|$)/);
  if (digitalLink && hasValidCheckDigit(digitalLink[1])) {
    return canonicalGtin(digitalLink[1]);
  }

  return null;
}
