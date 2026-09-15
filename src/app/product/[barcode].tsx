import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { USER_AGENT } from '../../appInfo';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { LabeledInput } from '../../components/LabeledInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { addLogEntry, getFoodItem, saveFoodItem, type FoodItem } from '../../db/repository';
import { normalizeBarcode } from '../../lib/barcode';
import { defaultMealType, formatDecimal, formatInt, MEAL_TYPES, parseDecimal, toInputText, type MealType } from '../../lib/format';
import { nutrientsForPortion } from '../../lib/nutrition';
import { fetchProduct, type PartialProduct } from '../../lib/openFoodFacts';
import { colors, radius, spacing } from '../../theme';

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'ready'; food: FoodItem }
  | { kind: 'manual'; reason: 'not_found' | 'incomplete' | 'error'; prefill: PartialProduct | null };

const MAX_PORTION_G = 5000;

export default function ProductScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ barcode: string }>();
  const barcode = normalizeBarcode(String(params.barcode ?? ''));

  const [state, setState] = useState<ScreenState>({ kind: 'loading' });

  const lookup = useCallback(async () => {
    if (!barcode) {
      setState({ kind: 'invalid' });
      return;
    }
    setState({ kind: 'loading' });

    // Zuerst lokal: schnell und funktioniert auch ohne Internet im Supermarkt.
    const local = await getFoodItem(db, barcode);
    if (local) {
      setState({ kind: 'ready', food: local });
      return;
    }

    const result = await fetchProduct(barcode, USER_AGENT);
    if (result.status === 'found') {
      const food: FoodItem = { ...result.product, source: 'openfoodfacts' };
      await saveFoodItem(db, food);
      setState({ kind: 'ready', food });
    } else if (result.status === 'incomplete') {
      setState({ kind: 'manual', reason: 'incomplete', prefill: result.partial });
    } else {
      setState({ kind: 'manual', reason: result.status, prefill: null });
    }
  }, [db, barcode]);

  useEffect(() => {
    lookup();
  }, [lookup]);

  const title = state.kind === 'manual' ? 'Nährwerte eingeben' : 'Eintragen';

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Zurück" style={styles.headerButton}>
          <Icon name="close" color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerButton} />
      </View>

      {state.kind === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Produkt wird gesucht …</Text>
        </View>
      )}

      {state.kind === 'invalid' && (
        <View style={styles.centered}>
          <Text style={styles.muted}>Dieser Code ist kein gültiger Produkt-Barcode.</Text>
          <PrimaryButton label="Erneut scannen" onPress={() => router.replace('/scan')} style={{ marginTop: spacing.md, alignSelf: 'stretch' }} />
        </View>
      )}

      {state.kind === 'manual' && barcode && (
        <ManualEntryForm
          barcode={barcode}
          reason={state.reason}
          prefill={state.prefill}
          onRetry={lookup}
          onSaved={(food) => setState({ kind: 'ready', food })}
        />
      )}

      {state.kind === 'ready' && (
        <PortionForm
          food={state.food}
          onSaved={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.dismissTo('/');
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function PortionForm({ food, onSaved }: { food: FoodItem; onSaved: () => void }) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [mealType, setMealType] = useState<MealType>(() => defaultMealType(new Date()));
  const [saving, setSaving] = useState(false);

  const grams = parseDecimal(amount);
  const validGrams = grams !== null && grams > 0 && grams <= MAX_PORTION_G ? grams : null;
  const portion = nutrientsForPortion(
    { calories: food.caloriesPer100g, protein: food.proteinPer100g, carbs: food.carbsPer100g, fat: food.fatPer100g },
    validGrams ?? 0,
  );

  const presets: { label: string; grams: number }[] = [
    ...(food.servingSizeG ? [{ label: `1 Packung (${formatDecimal(food.servingSizeG)} g)`, grams: food.servingSizeG }] : []),
    { label: '100 g', grams: 100 },
    { label: '1 Esslöffel (15 g)', grams: 15 },
    { label: '1 Teelöffel (5 g)', grams: 5 },
  ];

  const save = async () => {
    if (validGrams === null) return;
    setSaving(true);
    try {
      await addLogEntry(db, { barcode: food.barcode, grams: validGrams, mealType });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.productRow}>
          {food.imageUrl ? (
            <Image source={{ uri: food.imageUrl }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <View style={[styles.productImage, styles.imagePlaceholder]}>
              <Icon name="scan" color={colors.textMuted} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={2}>
              {food.name}
            </Text>
            {food.brand ? <Text style={styles.muted}>{food.brand}</Text> : null}
            <Text style={styles.per100}>
              pro 100 g: {formatInt(food.caloriesPer100g)} kcal · P {formatDecimal(food.proteinPer100g)} · K{' '}
              {formatDecimal(food.carbsPer100g)} · F {formatDecimal(food.fatPer100g)}
            </Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
            placeholder="0"
            placeholderTextColor={colors.border}
            style={styles.amountInput}
            maxLength={6}
            accessibilityLabel="Menge in Gramm"
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <Text style={styles.amountUnit}>g</Text>
        </View>

        <View style={styles.totals}>
          <Text style={styles.totalKcal}>{formatInt(portion.calories)} kcal</Text>
          <Text style={styles.muted}>
            Protein {formatDecimal(portion.protein)} g · Kohlenhydrate {formatDecimal(portion.carbs)} g · Fett {formatDecimal(portion.fat)} g
          </Text>
        </View>

        <View style={styles.chips}>
          {presets.map((preset) => (
            <Chip
              key={preset.label}
              label={preset.label}
              selected={grams === preset.grams}
              onPress={() => setAmount(toInputText(preset.grams))}
            />
          ))}
        </View>

        <View style={styles.chips}>
          {MEAL_TYPES.map((meal) => (
            <Chip key={meal.value} label={meal.label} selected={mealType === meal.value} onPress={() => setMealType(meal.value)} />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <PrimaryButton label="Speichern" onPress={save} disabled={validGrams === null} loading={saving} />
      </View>
    </>
  );
}

const REASON_TEXT = {
  not_found: 'Dieses Produkt ist noch nicht in der Datenbank. Gib die Nährwerte einmalig ein – beim nächsten Scan sind sie sofort da.',
  incomplete: 'Für dieses Produkt fehlen Nährwerte. Bitte ergänze sie einmalig von der Verpackung.',
  error: 'Keine Verbindung zur Produktdatenbank. Du kannst es erneut versuchen oder die Nährwerte von der Verpackung eintippen.',
} as const;

type ManualProps = {
  barcode: string;
  reason: keyof typeof REASON_TEXT;
  prefill: PartialProduct | null;
  onRetry: () => void;
  onSaved: (food: FoodItem) => void;
};

function ManualEntryForm({ barcode, reason, prefill, onRetry, onSaved }: ManualProps) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(prefill?.name ?? '');
  const [brand, setBrand] = useState(prefill?.brand ?? '');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [packageSize, setPackageSize] = useState(prefill?.servingSizeG ? toInputText(prefill.servingSizeG) : '');
  const [saving, setSaving] = useState(false);

  const kcalValue = parseDecimal(kcal);
  const proteinValue = parseDecimal(protein);
  const carbsValue = parseDecimal(carbs);
  const fatValue = parseDecimal(fat);
  const packageValue = parseDecimal(packageSize);

  const kcalError = kcalValue !== null && kcalValue > 900 ? 'Mehr als 900 kcal pro 100 g ist nicht möglich.' : null;
  const macroSum = (proteinValue ?? 0) + (carbsValue ?? 0) + (fatValue ?? 0);
  const macroError = macroSum > 100 ? 'Protein, Kohlenhydrate und Fett zusammen können nicht über 100 g liegen.' : null;
  const packageError = packageSize.trim() !== '' && (packageValue === null || packageValue <= 0) ? 'Ungültige Menge.' : null;

  const canSave =
    name.trim() !== '' &&
    kcalValue !== null &&
    proteinValue !== null &&
    carbsValue !== null &&
    fatValue !== null &&
    !kcalError &&
    !macroError &&
    !packageError &&
    !saving;

  const save = async () => {
    if (!canSave || kcalValue === null || proteinValue === null || carbsValue === null || fatValue === null) return;
    setSaving(true);
    try {
      const food: FoodItem = {
        barcode,
        name: name.trim(),
        brand: brand.trim(),
        caloriesPer100g: Math.round(kcalValue),
        proteinPer100g: proteinValue,
        carbsPer100g: carbsValue,
        fatPer100g: fatValue,
        servingSizeG: packageValue && packageValue > 0 ? packageValue : null,
        imageUrl: prefill?.imageUrl ?? null,
        source: 'manual',
      };
      await saveFoodItem(db, food);
      onSaved(food);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.reason}>{REASON_TEXT[reason]}</Text>
        {reason === 'error' && (
          <PrimaryButton label="Erneut versuchen" variant="secondary" onPress={onRetry} style={{ marginBottom: spacing.md }} />
        )}
        <Text style={styles.barcode}>Barcode {barcode}</Text>

        <LabeledInput label="Produktname" keyboardType="default" value={name} onChangeText={setName} placeholder="z. B. Magerquark" autoFocus={!prefill?.name} />
        <LabeledInput label="Marke (optional)" keyboardType="default" value={brand} onChangeText={setBrand} />

        <Text style={styles.sectionLabel}>Nährwerte pro 100 g</Text>
        <LabeledInput label="Kalorien" unit="kcal" value={kcal} onChangeText={setKcal} error={kcalError} autoFocus={Boolean(prefill?.name)} />
        <View style={styles.macroRow}>
          <View style={{ flex: 1 }}>
            <LabeledInput label="Protein" unit="g" value={protein} onChangeText={setProtein} />
          </View>
          <View style={{ flex: 1 }}>
            <LabeledInput label="Kohlenh." unit="g" value={carbs} onChangeText={setCarbs} />
          </View>
          <View style={{ flex: 1 }}>
            <LabeledInput label="Fett" unit="g" value={fat} onChangeText={setFat} />
          </View>
        </View>
        {macroError && <Text style={styles.error}>{macroError}</Text>}

        <LabeledInput label="Packungsgröße (optional)" unit="g" value={packageSize} onChangeText={setPackageSize} error={packageError} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <PrimaryButton label="Produkt speichern" onPress={save} disabled={!canSave} loading={saving} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  content: { padding: spacing.md, paddingBottom: spacing.lg },
  muted: { fontSize: 14, color: colors.textMuted },
  productRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.lg },
  productImage: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surface },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 20, fontWeight: '700', color: colors.text },
  per100: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  amountInput: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.text,
    minWidth: 120,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  amountUnit: { fontSize: 32, fontWeight: '700', color: colors.textMuted, marginLeft: 8 },
  totals: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  totalKcal: { fontSize: 24, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  reason: { fontSize: 15, color: colors.text, lineHeight: 21, marginBottom: spacing.md },
  barcode: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, fontVariant: ['tabular-nums'] },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  error: { fontSize: 13, color: colors.danger, marginTop: -6, marginBottom: spacing.sm },
});
