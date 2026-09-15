import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'allahuma-diaet.db';

const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  // Muss pro Verbindung gesetzt werden, nicht nur bei der Migration.
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = result?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE user_profile (
        id TEXT PRIMARY KEY NOT NULL,
        age INTEGER NOT NULL,
        sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
        height_cm REAL NOT NULL,
        weight_kg REAL NOT NULL,
        goal_weight_kg REAL NOT NULL,
        activity_level TEXT NOT NULL,
        daily_calorie_goal INTEGER NOT NULL,
        macro_split_protein REAL NOT NULL,
        macro_split_carbs REAL NOT NULL,
        macro_split_fat REAL NOT NULL
      );

      CREATE TABLE food_item (
        barcode TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        brand TEXT NOT NULL DEFAULT '',
        calories_per_100g INTEGER NOT NULL,
        protein_per_100g REAL NOT NULL,
        carbs_per_100g REAL NOT NULL,
        fat_per_100g REAL NOT NULL,
        serving_size_g REAL,
        image_url TEXT,
        source TEXT NOT NULL CHECK (source IN ('openfoodfacts', 'manual'))
      );

      CREATE TABLE log_entry (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        barcode TEXT NOT NULL REFERENCES food_item (barcode),
        consumed_weight_g REAL NOT NULL,
        meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack'))
      );

      CREATE INDEX idx_log_entry_date ON log_entry (date);
    `);
    currentVersion = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
