import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { Icon, type IconName } from './Icon';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  /** Icon links neben der Beschriftung. */
  icon?: IconName;
  /** Icon am rechten Rand, z. B. ein Chevron für aufklappbare Bereiche. */
  trailingIcon?: IconName;
  /** Setzt accessibilityState.expanded für aufklappbare Bereiche. */
  expanded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  icon,
  trailingIcon,
  expanded,
  style,
}: Props) {
  const isFilled = variant !== 'secondary';
  const inactive = disabled || loading;
  const contentColor = isFilled ? colors.onPrimary : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, expanded }}
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
        <ActivityIndicator color={contentColor} />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} size={20} color={contentColor} />}
          <Text style={[styles.label, { color: contentColor }, (icon || trailingIcon) && styles.labelWithIcon]} numberOfLines={1}>
            {label}
          </Text>
          {trailingIcon && <Icon name={trailingIcon} size={20} color={isFilled ? colors.onPrimary : colors.textMuted} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Mindestens 48 pt hoch; feste Höhe, damit alle Buttons der App gleich wirken.
  button: { height: 58, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch', justifyContent: 'center' },
  label: { fontSize: 18, fontWeight: '700' },
  // Mit Icons linksbündig und flexibel, damit lange Beschriftungen nicht am Chevron kleben.
  labelWithIcon: { flex: 1, fontSize: 16, textAlign: 'left' },
});
