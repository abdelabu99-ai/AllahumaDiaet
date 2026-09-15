import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius } from '../theme';

type Props = { label: string; selected?: boolean; onPress: () => void };

export function Chip({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.text, borderColor: colors.text },
  label: { fontSize: 14, color: colors.text, fontWeight: '500' },
  selectedLabel: { color: colors.surface },
});
