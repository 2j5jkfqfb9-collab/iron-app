import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, border, tracking } from '@/theme/tokens';
import { fmtKg } from '@/utils/format';
import { useUnitStore } from '@/store/unitStore';

const KG_TO_LB = 2.20462;
const BAR_KG = 20;

const WARM_UP_STEPS = [
  { pct: 0.5, reps: 5, label: '50%' },
  { pct: 0.7, reps: 3, label: '70%' },
  { pct: 0.85, reps: 2, label: '85%' },
] as const;

type Props = {
  workingWeightKg: number;
  workingReps: number;
};

export function WarmUpGuide({ workingWeightKg, workingReps }: Props) {
  const [expanded, setExpanded] = useState(false);
  const unit = useUnitStore((s) => s.unit);
  const isLb = unit === 'lb';

  const barSteps = workingWeightKg > 60
    ? [{ weight: BAR_KG, reps: 8, label: 'Bar' }]
    : [];

  const steps = [
    ...barSteps,
    ...WARM_UP_STEPS.map(({ pct, reps, label }) => ({
      weight: Math.round((workingWeightKg * pct) / 2.5) * 2.5,
      reps,
      label,
    })),
  ];

  const previewText = steps
    .slice(0, 3)
    .map((s) => `${fmtKg(isLb ? s.weight * KG_TO_LB : s.weight)}×${s.reps}`)
    .join('  ');

  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Warm-Up</Text>
        {!expanded && <Text style={styles.preview}>{previewText}</Text>}
        <Text style={styles.toggle}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View style={styles.table}>
          {steps.map((s, i) => {
            const displayW = fmtKg(isLb ? s.weight * KG_TO_LB : s.weight);
            return (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepLabel}>{s.label}</Text>
                <Text style={styles.stepVal}>{s.reps}</Text>
                <Text style={styles.stepSep}>reps</Text>
                <Text style={styles.stepVal}>{displayW}</Text>
                <Text style={styles.stepUnit}>{unit.toUpperCase()}</Text>
              </View>
            );
          })}
          <View style={[styles.stepRow, styles.workingRow]}>
            <Text style={[styles.stepLabel, styles.workingLabel]}>Working</Text>
            <Text style={[styles.stepVal, styles.workingVal]}>{workingReps}</Text>
            <Text style={styles.stepSep}>reps</Text>
            <Text style={[styles.stepVal, styles.workingVal]}>
              {fmtKg(isLb ? workingWeightKg * KG_TO_LB : workingWeightKg)}
            </Text>
            <Text style={styles.stepUnit}>{unit.toUpperCase()}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  headerLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 8,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  preview: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.ink2,
  },
  toggle: {
    fontFamily: fonts.display,
    fontSize: 8,
    color: colors.muted,
  },
  table: {
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 5,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  stepLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    width: 44,
  },
  stepVal: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 0.5,
    color: colors.ink,
    minWidth: 32,
    textAlign: 'right',
  },
  stepSep: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginRight: 4,
  },
  stepUnit: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.wide,
    color: colors.muted,
  },
  workingRow: {
    borderBottomWidth: 0,
  },
  workingLabel: { color: colors.accent },
  workingVal: { color: colors.accent },
});
