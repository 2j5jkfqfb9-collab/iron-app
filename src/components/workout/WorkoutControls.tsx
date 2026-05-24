import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, border, tracking } from '@/theme/tokens';

type Props = {
  onPrev: () => void;
  onNext: () => void;
  onComplete: () => void;
  primaryLabel?: string;
  hasPrev?: boolean;
  hasNext?: boolean;
};

function PrevIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round">
      <Path d="M19 20L9 12l10-8v16z" fill={colors.ink} />
      <Path d="M5 19V5" />
    </Svg>
  );
}

function NextIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round">
      <Path d="M5 4l10 8-10 8V4z" fill={colors.ink} />
      <Path d="M19 5v14" />
    </Svg>
  );
}

export function WorkoutControls({ onPrev, onNext, onComplete, primaryLabel = '✓ Complete', hasPrev = true, hasNext = true }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.side, !hasPrev && styles.sideDisabled]}
        onPress={hasPrev ? onPrev : undefined}
        activeOpacity={hasPrev ? 0.7 : 1}
      >
        <PrevIcon />
      </TouchableOpacity>

      <View style={styles.sideDivider} />

      <TouchableOpacity style={styles.primary} onPress={onComplete} activeOpacity={0.8}>
        <Text style={styles.primaryLabel}>{primaryLabel}</Text>
      </TouchableOpacity>

      <View style={styles.sideDivider} />

      <TouchableOpacity
        style={[styles.side, !hasNext && styles.sideDisabled]}
        onPress={hasNext ? onNext : undefined}
        activeOpacity={hasNext ? 0.7 : 1}
      >
        <NextIcon />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: border.heavy,
    borderColor: colors.ink,
    marginTop: 'auto',
  },
  side: {
    width: 50,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideDisabled: {
    opacity: 0.2,
  },
  sideDivider: {
    width: border.heavy,
    backgroundColor: colors.ink,
  },
  primary: {
    flex: 1,
    height: 54,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: tracking.max,
    textTransform: 'uppercase',
    color: colors.bg,
  },
});
