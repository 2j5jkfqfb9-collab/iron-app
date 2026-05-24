import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { colors, fonts, border, tracking } from '@/theme/tokens';

const RPE_WORDS = ['', 'easy', 'light', 'light', 'smooth', 'moderate', 'tough', 'solid', 'hard', 'very hard', 'max'];

type Props = {
  value: number; // 1..10
  onChange: (value: number) => void;
};

export function RPESlider({ value, onChange }: Props) {
  const trackWidth = useSharedValue(0);
  const markerPct = useSharedValue((value - 1) / 9);

  useEffect(() => {
    markerPct.value = (value - 1) / 9;
  }, [value, markerPct]);

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidth.value = e.nativeEvent.layout.width;
  };

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const updateValue = useCallback(
    (pct: number) => {
      const clamped = clamp(pct, 0, 1);
      const rpe = Math.round(clamped * 9) + 1; // maps 0..1 → 1..10
      onChange(rpe);
    },
    [onChange],
  );

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (trackWidth.value <= 0) return;
      const pct = clamp(e.x / trackWidth.value, 0, 1);
      markerPct.value = pct;
      runOnJS(updateValue)(pct);
    });

  const tap = Gesture.Tap()
    .onEnd((e) => {
      if (trackWidth.value <= 0) return;
      const pct = clamp(e.x / trackWidth.value, 0, 1);
      markerPct.value = pct;
      runOnJS(updateValue)(pct);
    });

  const gesture = Gesture.Simultaneous(pan, tap);

  const markerStyle = useAnimatedStyle(() => ({
    left: `${markerPct.value * 100}%`,
  }));

  const ticks = Array.from({ length: 11 }, (_, i) => i);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>How did that set feel?</Text>
        <Text style={styles.headerVal}>
          {value}
          <Text style={styles.headerWord}> {RPE_WORDS[value]}</Text>
        </Text>
      </View>

      <GestureDetector gesture={gesture}>
        <View style={styles.track} onLayout={onLayout}>
          {/* Tick marks — odd ticks full height, even ticks half height */}
          <View style={styles.ticksContainer}>
            {ticks.map((i) => (
              <View
                key={i}
                style={[
                  styles.tick,
                  i % 2 === 0 ? styles.tickFull : styles.tickHalf,
                ]}
              />
            ))}
          </View>

          {/* Marker */}
          <Animated.View style={[styles.marker, markerStyle]}>
            <View style={styles.markerTriangle} />
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.nums}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Text key={n} style={styles.num}>{n}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    borderWidth: border.heavy,
    borderColor: colors.ink,
    padding: 10,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  headerLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.ink2,
  },
  headerVal: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 1,
    color: colors.ink,
  },
  headerWord: {
    fontFamily: fonts.sansItalic,
    fontSize: 11,
    color: colors.accent,
    fontStyle: 'italic',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  track: {
    height: 24,
    position: 'relative',
    justifyContent: 'flex-start',
  },
  ticksContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tick: {
    width: 1,
    backgroundColor: colors.ink,
    opacity: 0.6,
  },
  tickFull: {
    height: 24,
    opacity: 0.8,
  },
  tickHalf: {
    height: 14,
    opacity: 0.4,
  },
  marker: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 24,
    backgroundColor: colors.accent,
    transform: [{ translateX: -1 }],
  },
  markerTriangle: {
    position: 'absolute',
    top: -5,
    left: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.accent,
    transform: [{ rotate: '180deg' }],
  },
  nums: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  num: {
    fontFamily: fonts.display,
    fontSize: 10,
    color: colors.muted,
  },
});
