import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { formatInt } from '../lib/format';
import { colors } from '../theme';

type Props = { consumed: number; goal: number; size?: number };

const STROKE = 16;

export function CalorieRing({ consumed, goal, size = 210 }: Props) {
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const remaining = goal - consumed;
  const isOver = remaining < 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.track} strokeWidth={STROKE} fill="none" />
        {/* Bei 0 kcal würde die runde Linienkappe sonst einen Punkt zeichnen. */}
        {progress > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isOver ? colors.danger : colors.primary}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - progress)}
            // Start oben statt rechts.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.remaining, isOver && { color: colors.danger }]}>{formatInt(Math.abs(remaining))}</Text>
        <Text style={styles.label}>{isOver ? 'kcal zu viel' : 'kcal übrig'}</Text>
        <Text style={styles.sub}>
          {formatInt(consumed)} / {formatInt(goal)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  remaining: { fontSize: 44, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  label: { fontSize: 15, color: colors.textMuted, marginTop: -2 },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 6, fontVariant: ['tabular-nums'] },
});
