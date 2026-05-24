import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import type { ActiveSet } from '@/types';
import { colors, fonts, tracking } from '@/theme/tokens';
import { fmtKg } from '@/utils/format';
import { useUnitStore } from '@/store/unitStore';

const KG_TO_LB = 2.20462;

type Props = {
  sets: ActiveSet[];
  currentIndex: number;
  isRest?: boolean;
};

function AnimatedBar({ isDone, isCurrent }: { isDone: boolean; isCurrent: boolean }) {
  const scaleY = useSharedValue(1);
  const prevDone = useRef(isDone);

  useEffect(() => {
    if (!prevDone.current && isDone) {
      scaleY.value = withSequence(
        withTiming(2.2, { duration: 90 }),
        withTiming(1, { duration: 220 }),
      );
    }
    prevDone.current = isDone;
  }, [isDone, scaleY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        isDone && styles.barDone,
        isCurrent && styles.barCurrent,
        animStyle,
      ]}
    />
  );
}

export function SetMeter({ sets, currentIndex, isRest = false }: Props) {
  const unit = useUnitStore((s) => s.unit);

  return (
    <View style={styles.row}>
      {sets.map((s, i) => {
        const isDone = s.state === 'done';
        const isCurrent = isRest
          ? i === currentIndex + 1
          : i === currentIndex && s.state !== 'done';
        const displayW = isDone
          ? fmtKg(unit === 'lb' ? s.weightKg * KG_TO_LB : s.weightKg)
          : null;
        return (
          <View key={i} style={styles.col}>
            <Text
              style={[
                styles.num,
                isDone && styles.numDone,
                isCurrent && styles.numCurrent,
              ]}
            >
              {String(i + 1).padStart(2, '0')}
            </Text>
            <AnimatedBar isDone={isDone} isCurrent={isCurrent} />
            {isDone && displayW ? (
              <Text style={styles.logLabel} numberOfLines={1} adjustsFontSizeToFit>
                {s.reps}×{displayW}
              </Text>
            ) : (
              <View style={styles.logPlaceholder} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  num: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.muted,
    textDecorationLine: 'none',
  },
  numDone: {
    color: colors.ink,
    textDecorationLine: 'line-through',
  },
  numCurrent: {
    color: colors.accent,
  },
  bar: {
    height: 4,
    width: '100%',
    marginTop: 4,
    backgroundColor: colors.lineSoft,
  },
  barDone: {
    backgroundColor: colors.ink,
  },
  barCurrent: {
    backgroundColor: colors.accent,
  },
  logLabel: {
    fontFamily: fonts.display,
    fontSize: 9,
    letterSpacing: 0.3,
    color: colors.ink2,
    marginTop: 3,
    textAlign: 'center',
  },
  logPlaceholder: {
    height: 13,
    marginTop: 3,
  },
});
