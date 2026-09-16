// Welche Nährwerte gelten, wenn es ein Lebensmittel lokal und bei Open Food Facts gibt?
// Regel: Lokal gespeicherte Werte gewinnen immer, korrigierte Werte (user_edited) dürfen
// nie durch Open-Food-Facts-Daten überschrieben werden – außer der Nutzer stellt sie
// ausdrücklich wieder her.

export type LocalFoodState = { userEdited: boolean } | null;

export type RemoteState = 'found' | 'incomplete' | 'missing';

export type FoodSourceDecision = 'local' | 'remote' | 'manual';

export function chooseFoodSource(input: { local: LocalFoodState; remote: RemoteState }): FoodSourceDecision {
  if (input.local) return 'local';
  if (input.remote === 'found') return 'remote';
  return 'manual';
}

/** Darf ein Abruf von Open Food Facts den lokalen Datensatz überschreiben? */
export function mayOverwriteWithRemote(local: LocalFoodState): boolean {
  if (!local) return true;
  return !local.userEdited;
}
