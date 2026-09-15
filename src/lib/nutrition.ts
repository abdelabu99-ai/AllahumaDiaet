// Reine Rechenlogik ohne React-Native-Abhängigkeiten, damit sie mit `node --test` testbar bleibt.

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type ActivityOption = {
  value: ActivityLevel;
  label: string;
  description: string;
  pal: number;
};

// PAL-Werte angelehnt an die Referenzwerte der DGE.
export const ACTIVITY_LEVELS: ActivityOption[] = [
  { value: 'sedentary', label: 'Sitzend', description: 'Bürojob, kaum Bewegung', pal: 1.4 },
  { value: 'light', label: 'Leicht aktiv', description: 'Sitzend, zeitweise gehend oder stehend', pal: 1.6 },
  { value: 'moderate', label: 'Aktiv', description: 'Überwiegend gehend oder stehend', pal: 1.8 },
  { value: 'active', label: 'Sehr aktiv', description: 'Körperlich anstrengender Beruf oder viel Sport', pal: 2.0 },
  { value: 'very_active', label: 'Schwerstarbeit', description: 'z. B. Bau, Landwirtschaft, Leistungssport', pal: 2.3 },
];

export type MacroSplit = { protein: number; carbs: number; fat: number };

export const DEFAULT_MACRO_SPLIT: MacroSplit = { protein: 0.3, carbs: 0.5, fat: 0.2 };

export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

// Tagesdefizit bzw. -überschuss, wenn das Zielgewicht vom aktuellen Gewicht abweicht.
export const LOSE_WEIGHT_ADJUSTMENT = -500;
export const GAIN_WEIGHT_ADJUSTMENT = 300;

export type BodyData = {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
};

export type GoalInput = BodyData & {
  goalWeightKg: number;
  activityLevel: ActivityLevel;
};

export type CalorieGoal = {
  bmr: number;
  tdee: number;
  adjustment: number;
  dailyGoal: number;
};

export const LIMITS = {
  age: { min: 18, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 300 },
} as const;

/** Grundumsatz nach Mifflin-St. Jeor in kcal/Tag. */
export function bmrMifflinStJeor({ age, sex, heightCm, weightKg }: BodyData): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function palFor(level: ActivityLevel): number {
  const option = ACTIVITY_LEVELS.find((o) => o.value === level);
  if (!option) throw new Error(`Unbekanntes Aktivitätslevel: ${level}`);
  return option.pal;
}

export function calculateCalorieGoal(input: GoalInput): CalorieGoal {
  const bmr = bmrMifflinStJeor(input);
  const tdee = bmr * palFor(input.activityLevel);
  const weightDiff = input.goalWeightKg - input.weightKg;

  let adjustment = 0;
  if (weightDiff <= -1) adjustment = LOSE_WEIGHT_ADJUSTMENT;
  else if (weightDiff >= 1) adjustment = GAIN_WEIGHT_ADJUSTMENT;

  // Nie unter den Grundumsatz gehen.
  const dailyGoal = roundTo(Math.max(tdee + adjustment, bmr), 10);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), adjustment, dailyGoal };
}

export function macroGoalsInGrams(dailyCalories: number, split: MacroSplit): MacroSplit {
  return {
    protein: Math.round((dailyCalories * split.protein) / KCAL_PER_GRAM.protein),
    carbs: Math.round((dailyCalories * split.carbs) / KCAL_PER_GRAM.carbs),
    fat: Math.round((dailyCalories * split.fat) / KCAL_PER_GRAM.fat),
  };
}

export function isValidMacroSplit(split: MacroSplit): boolean {
  const parts = [split.protein, split.carbs, split.fat];
  if (parts.some((p) => !Number.isFinite(p) || p < 0 || p > 1)) return false;
  return Math.round((split.protein + split.carbs + split.fat) * 100) === 100;
}

export type Nutrients = { calories: number; protein: number; carbs: number; fat: number };

/** Rechnet Nährwerte pro 100 g auf die gegessene Menge um. */
export function nutrientsForPortion(per100g: Nutrients, grams: number): Nutrients {
  const factor = grams / 100;
  return {
    calories: Math.round(per100g.calories * factor),
    protein: roundTo(per100g.protein * factor, 0.1),
    carbs: roundTo(per100g.carbs * factor, 0.1),
    fat: roundTo(per100g.fat * factor, 0.1),
  };
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  const total = items.reduce(
    (acc, n) => ({
      calories: acc.calories + n.calories,
      protein: acc.protein + n.protein,
      carbs: acc.carbs + n.carbs,
      fat: acc.fat + n.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return {
    calories: Math.round(total.calories),
    protein: roundTo(total.protein, 0.1),
    carbs: roundTo(total.carbs, 0.1),
    fat: roundTo(total.fat, 0.1),
  };
}

export function roundTo(value: number, step: number): number {
  const rounded = Math.round(value / step) * step;
  // Gleitkomma-Reste wie 12.300000000000001 entfernen.
  return Number(rounded.toFixed(step < 1 ? String(step).split('.')[1].length : 0));
}
