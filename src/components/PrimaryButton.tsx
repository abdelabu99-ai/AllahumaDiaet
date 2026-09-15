import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, onPress, disabled = false, loading = false, variant = 'primary', style }: Props) {
  const isFilled = variant !== 'secondary';
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && variant === 'primary' && { backgroundColor: colors.primaryPressed },
        pressed && variant === 'danger' && { backgroundColor: colors.dangerPressed },
        pressed && variant === 'secondary' && { opacity: 0.7 },
        inactive && { opacity: 0.4 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isFilled ? colors.onPrimary : colors.text} />
      ) : (
        <Text style={[styles.label, !isFilled && { color: colors.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { height: 58, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  label: { fontSize: 18, fontWeight: '700', color: colors.onPrimary },
});
