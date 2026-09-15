import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalorieRing } from '../components/CalorieRing';
import { Icon } from '../components/Icon';
import { MacroBar } from '../components/MacroBar';
import { deleteLogEntry, getEntriesForDate, getProfile, type LogEntryWithFood, type Profile } from '../db/repository';
import { formatDecimal, formatInt, formatLongDate, formatTime, localDateKey, MEAL_TYPES, type MealType } from '../lib/format';
import { macroGoalsInGrams, nutrientsForPortion, sumNutrients, type Nutrients } from '../lib/nutrition';
import { colors, radius, spacing } from '../theme';

type EntryWithTotals = LogEntryWithFood & { totals: Nutrients };

export default function Dashboard() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [entries, setEntries] = useState<EntryWithTotals[]>([]);
  const [today, setToday] = useState(() => new Date());
  const [collapsed, setCollapsed] = useState<Partial<Record<MealType, boolean>>>({});

  const load = useCallback(async () => {
    // Datum bei jedem Fokus neu bestimmen, damit nach Mitternacht der neue Tag angezeigt wird.
    const now = new Date();
    setToday(now);
    const [loadedProfile, rows] = await Promise.all([getProfile(db), getEntriesForDate(db, localDateKey(now))]);
    setProfile(loadedProfile);
    setEntries(rows.map((row) => ({ ...row, totals: nutrientsForPortion(row.per100g, row.grams) })));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totals = useMemo(() => sumNutrients(entries.map((e) => e.totals)), [entries]);

  if (profile === undefined) return <View style={styles.screen} />;
  if (profile === null) return <Redirect href="/onboarding" />;

  const macroGoals = macroGoalsInGrams(profile.dailyCalorieGoal, profile.macroSplit);

  const confirmDelete = (entry: EntryWithTotals) => {
    Alert.alert('Eintrag löschen?', `${entry.name} (${formatInt(entry.grams)} g)`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await deleteLogEntry(db, entry.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 130 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Heute</Text>
            <Text style={styles.date}>{formatLongDate(today)}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/onboarding')}
            hitSlop={12}
            accessibilityLabel="Profil und Ziele bearbeiten"
            style={styles.iconButton}
          >
            <Icon name="settings" color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.ringWrap}>
            <CalorieRing consumed={totals.calories} goal={profile.dailyCalorieGoal} />
          </View>
          <View style={styles.macros}>
            <MacroBar label="Protein" consumed={totals.protein} goal={macroGoals.protein} color={colors.protein} />
            <MacroBar label="Kohlenh."consumed={totals.carbs} goal={macroGoals.carbs} color={colors.carbs} />
            <MacroBar label="Fett" consumed={totals.fat} goal={macroGoals.fat} color={colors.fat} />
          </View>
        </View>

        {entries.length === 0 ? (
          <Text style={styles.empty}>Noch nichts eingetragen.{'\n'}Tippe unten auf „Scannen“.</Text>
        ) : (
          MEAL_TYPES.map(({ value, label }) => {
            const mealEntries = entries.filter((e) => e.mealType === value);
            if (mealEntries.length === 0) return null;
            const mealCalories = mealEntries.reduce((sum, e) => sum + e.totals.calories, 0);
            const isCollapsed = collapsed[value] ?? false;

            return (
              <View key={value} style={styles.card}>
                <Pressable
                  onPress={() => setCollapsed((c) => ({ ...c, [value]: !isCollapsed }))}
                  style={styles.mealHeader}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: !isCollapsed }}
                >
                  <Text style={styles.mealTitle}>{label}</Text>
                  <View style={styles.mealHeaderRight}>
                    <Text style={styles.mealCalories}>{formatInt(mealCalories)} kcal</Text>
                    <Icon name={isCollapsed ? 'chevronDown' : 'chevronUp'} size={20} color={colors.textMuted} />
                  </View>
                </Pressable>

                {!isCollapsed &&
                  mealEntries.map((entry) => (
                    <Pressable
                      key={entry.id}
                      onLongPress={() => confirmDelete(entry)}
                      style={({ pressed }) => [styles.entry, pressed && { opacity: 0.6 }]}
                      accessibilityHint="Lange drücken zum Löschen"
                    >
                      <Text style={styles.entryTime}>{formatTime(entry.timestamp)}</Text>
                      <View style={styles.entryMain}>
                        <Text style={styles.entryName} numberOfLines={1}>
                          {entry.name}
                        </Text>
                        <Text style={styles.entryMeta} numberOfLines={1}>
                          {[entry.brand, `${formatDecimal(entry.grams)} g`].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <Text style={styles.entryCalories}>{formatInt(entry.totals.calories)}</Text>
                    </Pressable>
                  ))}
              </View>
            );
          })
        )}

        {entries.length > 0 && <Text style={styles.hint}>Zum Löschen einen Eintrag lange drücken.</Text>}
        <Text style={styles.attribution}>Daten & Bilder: Open Food Facts (ODbL, CC BY-SA)</Text>
        <Pressable onPress={() => router.push('/about')} hitSlop={8} style={styles.aboutLink} accessibilityRole="link">
          <Text style={styles.aboutLinkText}>Info & Rechtliches</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: insets.bottom + spacing.md }]} pointerEvents="box-none">
        <Pressable
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
          accessibilityLabel="Barcode scannen"
          style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.97 }] }]}
        >
          <Icon name="scan" color={colors.onPrimary} size={28} />
          <Text style={styles.fabLabel}>Scannen</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  date: { fontSize: 15, color: colors.textMuted },
  iconButton: { padding: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  ringWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  macros: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: 16, lineHeight: 24, marginTop: spacing.lg },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mealTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  mealCalories: { fontSize: 15, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: 10,
  },
  entryTime: { width: 48, fontSize: 13, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  entryMain: { flex: 1, marginRight: spacing.sm },
  entryName: { fontSize: 15, fontWeight: '600', color: colors.text },
  entryMeta: { fontSize: 13, color: colors.textMuted },
  entryCalories: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  hint: { textAlign: 'center', color: colors.textMuted, fontSize: 12 },
  attribution: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  aboutLink: { alignSelf: 'center', paddingVertical: spacing.xs, marginTop: 2 },
  aboutLinkText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 72,
    paddingHorizontal: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabLabel: { fontSize: 22, fontWeight: '800', color: colors.onPrimary },
});
