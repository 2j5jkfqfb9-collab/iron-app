import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, border, tracking } from '@/theme/tokens';
import { fmtKg } from '@/utils/format';
import { useUnitStore } from '@/store/unitStore';
import type { SetLog } from '@/types';

const KG_TO_LB = 2.20462;

type Props = {
  previousSets: SetLog[];
  restSeconds: number;
  workoutSeconds: number;
  currentVolumeKg: number;
};

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function StatsGrid({ previousSets, restSeconds, workoutSeconds, currentVolumeKg }: Props) {
  const unit = useUnitStore((s) => s.unit);
  const isResting = restSeconds > 0;
  const displayVolume = unit === 'lb'
    ? Math.round(currentVolumeKg * KG_TO_LB)
    : Math.round(currentVolumeKg);

  return (
    <View style={styles.grid}>
      {/* Previous session sets */}
      <View style={[styles.cell, { flex: 2 }]}>
        <Text style={styles.cellLabel}>Last Session</Text>
        <View style={styles.prevRow}>
          {previousSets.slice(0, 4).map((s, i) => (
            <View key={i} style={styles.prevCol}>
              <Text style={styles.prevReps}>{s.reps}</Text>
              <Text style={styles.prevKg}>
                {fmtKg(unit === 'lb' ? s.weightKg * KG_TO_LB : s.weightKg)}
              </Text>
            </View>
          ))}
          {previousSets.length === 0 && (
            <Text style={styles.noData}>—</Text>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Rest countdown or total workout time */}
      <View style={styles.cell}>
        <Text style={styles.cellLabel}>{isResting ? 'Rest Left' : 'Workout'}</Text>
        <Text style={[styles.cellValue, isResting && styles.cellValueRest]}>
          {isResting ? formatTime(restSeconds) : formatTime(workoutSeconds)}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Live workout volume */}
      <View style={styles.cell}>
        <Text style={styles.cellLabel}>Vol {unit.toUpperCase()}</Text>
        <Text style={styles.cellValue}>
          {displayVolume > 0 ? displayVolume.toLocaleString() : '—'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    borderWidth: border.heavy,
    borderColor: colors.ink,
    marginTop: 10,
  },
  cell: {
    flex: 1,
    padding: 8,
    paddingHorizontal: 10,
  },
  divider: {
    width: border.heavy,
    backgroundColor: colors.ink,
  },
  cellLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.base,
    textTransform: 'uppercase',
    color: colors.ink2,
  },
  cellValue: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 0.5,
    color: colors.ink,
    marginTop: 4,
    lineHeight: 20,
  },
  cellValueRest: {
    color: colors.accent,
  },
  prevRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  prevCol: {
    flex: 1,
    alignItems: 'center',
  },
  prevReps: {
    fontFamily: fonts.display,
    fontSize: 13,
    lineHeight: 14,
    color: colors.ink,
  },
  prevKg: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  noData: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.muted,
  },
});
