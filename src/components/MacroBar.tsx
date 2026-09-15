import { StyleSheet, Text, View } from 'react-native';

import { formatInt } from '../lib/format';
import { colors, radius } from '../theme';

type Props = { label: string; consumed: number; goal: number; color: string };

export function MacroBar({ label, consumed, goal, color }: Props) {
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {formatInt(consumed)} / {formatInt(goal)} g
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'column', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  value: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
