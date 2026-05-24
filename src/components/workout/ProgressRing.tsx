import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts, tracking } from '@/theme/tokens';

const SIZE = 200;
const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
type Props = {
  elapsedSeconds: number;
  maxSeconds?: number;
  restTarget?: number;
  phase?: 'active' | 'rest' | 'done';
  currentSet?: number;
  totalSets?: number;
  isPaused?: boolean;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ProgressRing({ elapsedSeconds, maxSeconds = 120, restTarget = 90, phase = 'active', currentSet, totalSets, isPaused = false }: Props) {
  const isRest = phase === 'rest';

  // Active: fills up over maxSeconds. Rest: depletes over restTarget. Done: full ring.
  const progress = phase === 'done'
    ? 1
    : isRest
    ? Math.max(0, 1 - elapsedSeconds / restTarget)
    : Math.min(elapsedSeconds / maxSeconds, 1);

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const displaySeconds = isRest
    ? Math.max(0, restTarget - elapsedSeconds)
    : elapsedSeconds;

  const label = isPaused
    ? '⏸ Paused'
    : phase === 'done'
    ? '✓ Done'
    : phase === 'rest'
    ? '● Rest'
    : (currentSet != null && totalSets != null)
    ? `Set ${currentSet} / ${totalSets}`
    : '● Active';

  const ringColor = isPaused ? colors.muted : phase === 'done' ? colors.good : isRest ? colors.ink2 : colors.accent;

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={styles.svg}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={colors.ink}
          strokeWidth={2}
          opacity={0.15}
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={ringColor}
          strokeWidth={5}
          strokeLinecap="square"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={styles.timer}>{formatTime(displaySeconds)}</Text>
        <Text style={[
          styles.label,
          isRest ? styles.labelRest : styles.labelActive,
          phase === 'done' && styles.labelDone,
        ]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
  },
  timer: {
    fontFamily: fonts.display,
    fontSize: 62,
    lineHeight: 56,
    letterSpacing: 1,
    color: colors.ink,
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: tracking.wider,
    textTransform: 'uppercase',
    color: colors.accent,
    marginTop: 6,
  },
  labelRest: {
    color: colors.ink2,
  },
  labelActive: {
    color: colors.accent,
  },
  labelDone: {
    color: colors.good,
  },
});
