import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { localDateKey, type MealType } from '../lib/format';
import type { ActivityLevel, MacroSplit, Nutrients, Sex } from '../lib/nutrition';
import type { ProductData } from '../lib/openFoodFacts';

export type Profile = {
  id: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  activityLevel: ActivityLevel;
  dailyCalorieGoal: number;
  macroSplit: MacroSplit;
};

export type FoodItem = ProductData & { source: 'openfoodfacts' | 'manual' };

export type LogEntryWithFood = {
  id: string;
  timestamp: string;
  mealType: MealType;
  grams: number;
  name: string;
  brand: string;
  per100g: Nutrients;
};

type ProfileRow = {
  id: string;
  age: number;
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  goal_weight_kg: number;
  activity_level: ActivityLevel;
  daily_calorie_goal: number;
  macro_split_protein: number;
  macro_split_carbs: number;
  macro_split_fat: number;
};

type FoodItemRow = {
  barcode: string;
  name: string;
  brand: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  serving_size_g: number | null;
  image_url: string | null;
  source: 'openfoodfacts' | 'manual';
};

type LogEntryRow = {
  id: string;
  timestamp: string;
  meal_type: MealType;
  consumed_weight_g: number;
  name: string;
  brand: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
};

export async function getProfile(db: SQLiteDatabase): Promise<Profile | null> {
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM user_profile LIMIT 1');
  if (!row) return null;
  return {
    id: row.id,
    age: row.age,
    sex: row.sex,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    goalWeightKg: row.goal_weight_kg,
    activityLevel: row.activity_level,
    dailyCalorieGoal: row.daily_calorie_goal,
    macroSplit: {
      protein: row.macro_split_protein,
      carbs: row.macro_split_carbs,
      fat: row.macro_split_fat,
    },
  };
}

export async function saveProfile(db: SQLiteDatabase, profile: Omit<Profile, 'id'>): Promise<void> {
  const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM user_profile LIMIT 1');
  const id = existing?.id ?? randomUUID();
  await db.runAsync(
    `INSERT INTO user_profile (
       id, age, sex, height_cm, weight_kg, goal_weight_kg, activity_level,
       daily_calorie_goal, macro_split_protein, macro_split_carbs, macro_split_fat
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       age = excluded.age,
       sex = excluded.sex,
       height_cm = excluded.height_cm,
       weight_kg = excluded.weight_kg,
       goal_weight_kg = excluded.goal_weight_kg,
       activity_level = excluded.activity_level,
       daily_calorie_goal = excluded.daily_calorie_goal,
       macro_split_protein = excluded.macro_split_protein,
       macro_split_carbs = excluded.macro_split_carbs,
       macro_split_fat = excluded.macro_split_fat`,
    id,
    profile.age,
    profile.sex,
    profile.heightCm,
    profile.weightKg,
    profile.goalWeightKg,
    profile.activityLevel,
    profile.dailyCalorieGoal,
    profile.macroSplit.protein,
    profile.macroSplit.carbs,
    profile.macroSplit.fat,
  );
}

export async function getFoodItem(db: SQLiteDatabase, barcode: string): Promise<FoodItem | null> {
  const row = await db.getFirstAsync<FoodItemRow>('SELECT * FROM food_item WHERE barcode = ?', barcode);
  if (!row) return null;
  return {
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    caloriesPer100g: row.calories_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatPer100g: row.fat_per_100g,
    servingSizeG: row.serving_size_g,
    imageUrl: row.image_url,
    source: row.source,
  };
}

export async function saveFoodItem(db: SQLiteDatabase, item: FoodItem): Promise<void> {
  await db.runAsync(
    `INSERT INTO food_item (
       barcode, name, brand, calories_per_100g, protein_per_100g, carbs_per_100g,
       fat_per_100g, serving_size_g, image_url, source
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (barcode) DO UPDATE SET
       name = excluded.name,
       brand = excluded.brand,
       calories_per_100g = excluded.calories_per_100g,
       protein_per_100g = excluded.protein_per_100g,
       carbs_per_100g = excluded.carbs_per_100g,
       fat_per_100g = excluded.fat_per_100g,
       serving_size_g = excluded.serving_size_g,
       image_url = excluded.image_url,
       source = excluded.source`,
    item.barcode,
    item.name,
    item.brand,
    item.caloriesPer100g,
    item.proteinPer100g,
    item.carbsPer100g,
    item.fatPer100g,
    item.servingSizeG,
    item.imageUrl,
    item.source,
  );
}

export async function addLogEntry(
  db: SQLiteDatabase,
  entry: { barcode: string; grams: number; mealType: MealType; at?: Date },
): Promise<void> {
  const at = entry.at ?? new Date();
  await db.runAsync(
    'INSERT INTO log_entry (id, date, timestamp, barcode, consumed_weight_g, meal_type) VALUES (?, ?, ?, ?, ?, ?)',
    randomUUID(),
    localDateKey(at),
    at.toISOString(),
    entry.barcode,
    entry.grams,
    entry.mealType,
  );
}

export async function deleteLogEntry(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM log_entry WHERE id = ?', id);
}

export async function getEntriesForDate(db: SQLiteDatabase, date: string): Promise<LogEntryWithFood[]> {
  const rows = await db.getAllAsync<LogEntryRow>(
    `SELECT e.id, e.timestamp, e.meal_type, e.consumed_weight_g,
            f.name, f.brand, f.calories_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fat_per_100g
       FROM log_entry e
       JOIN food_item f ON f.barcode = e.barcode
      WHERE e.date = ?
      ORDER BY e.timestamp ASC`,
    date,
  );
  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    mealType: row.meal_type,
    grams: row.consumed_weight_g,
    name: row.name,
    brand: row.brand,
    per100g: {
      calories: row.calories_per_100g,
      protein: row.protein_per_100g,
      carbs: row.carbs_per_100g,
      fat: row.fat_per_100g,
    },
  }));
}
