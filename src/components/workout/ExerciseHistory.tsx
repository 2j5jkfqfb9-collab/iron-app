import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { colors, fonts, border, tracking } from '@/theme/tokens';
import { fmtKg } from '@/utils/format';
import { useUnitStore } from '@/store/unitStore';
import type { WorkoutSession } from '@/types';

const KG_TO_LB = 2.20462;

type Props = {
  exerciseId: string;
  sessions: WorkoutSession[];
  maxRows?: number;
};

function topSet(session: WorkoutSession, exerciseId: string) {
  const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
  if (!ex || ex.sets.length === 0) return null;
  return ex.sets.reduce((best, s) =>
    s.weightKg * s.reps > best.weightKg * best.reps ? s : best,
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function epley1RM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return Math.round((weightKg * (1 + reps / 30)) / 2.5) * 2.5;
}

const CHART_W = 300;
const CHART_H = 48;
const PAD = 8;

function OneRMChart({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (CHART_W - PAD * 2);
    const y = CHART_H - PAD - ((v - min) / range) * (CHART_H - PAD * 2);
    return { x, y, v };
  });

  const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const last = pts[pts.length - 1];
  const isUp = values[values.length - 1] >= values[0];

  return (
    <View style={styles.chart}>
      <Text style={styles.chartLabel}>1RM Trend</Text>
      <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <Line
          x1={PAD} y1={CHART_H - PAD}
          x2={CHART_W - PAD} y2={CHART_H - PAD}
          stroke={colors.lineSoft}
          strokeWidth={1}
        />
        <Polyline
          points={pointsStr}
          fill="none"
          stroke={isUp ? colors.good : colors.accent}
          strokeWidth={2}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {pts.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={i === pts.length - 1 ? (isUp ? colors.good : colors.accent) : colors.surface2}
            stroke={isUp ? colors.good : colors.accent}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
      <Text style={[styles.chartVal, { color: isUp ? colors.good : colors.accent }]}>
        {isUp ? '↑' : '↓'} {fmtKg(last.v)}
      </Text>
    </View>
  );
}

export function ExerciseHistory({ exerciseId, sessions, maxRows = 5 }: Props) {
  const unit = useUnitStore((s) => s.unit);
  const rows = sessions
    .filter((s) => s.exercises.some((e) => e.exerciseId === exerciseId))
    .slice(0, maxRows)
    .map((s) => {
      const ex = s.exercises.find((e) => e.exerciseId === exerciseId)!;
      const best = topSet(s, exerciseId);
      return { id: s.id, date: s.startedAt, best, setsCount: ex.sets.length };
    });

  if (rows.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.empty}>No history for this exercise yet.</Text>
      </View>
    );
  }

  // Oldest → newest for chart
  const oneRMs = [...rows].reverse()
    .map((r) => r.best ? epley1RM(r.best.weightKg, r.best.reps) * (unit === 'lb' ? KG_TO_LB : 1) : null)
    .filter((v): v is number => v !== null);

  return (
    <View style={styles.wrap}>
      {oneRMs.length >= 2 && <OneRMChart values={oneRMs} />}

      <View style={styles.tableHead}>
        <Text style={[styles.headCell, { flex: 1.2 }]}>Date</Text>
        <Text style={[styles.headCell, styles.right]}>Top Set</Text>
        <Text style={[styles.headCell, styles.right]}>1RM~</Text>
        <Text style={[styles.headCell, styles.right]}>RPE</Text>
      </View>
      {rows.map((r) => (
        <View key={r.id} style={styles.row}>
          <Text style={[styles.cell, styles.dateCell, { flex: 1.2 }]}>{shortDate(r.date)}</Text>
          {r.best ? (
            <Text style={[styles.cell, styles.topSetCell, styles.right]}>
              {r.best.reps}
              <Text style={styles.cellMuted}>×</Text>
              {fmtKg(unit === 'lb' ? r.best.weightKg * KG_TO_LB : r.best.weightKg)}
            </Text>
          ) : (
            <Text style={[styles.cell, styles.right, { color: colors.muted }]}>—</Text>
          )}
          <Text style={[styles.cell, styles.right, styles.oneRMCell]}>
            {r.best ? fmtKg(unit === 'lb'
              ? epley1RM(r.best.weightKg, r.best.reps) * KG_TO_LB
              : epley1RM(r.best.weightKg, r.best.reps)) : '—'}
          </Text>
          <Text style={[styles.cell, styles.right, { color: colors.accent }]}>
            {r.best?.rpe ?? '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: border.heavy,
    borderColor: colors.ink,
    marginBottom: 2,
  },
  empty: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.muted,
    padding: 12,
    textAlign: 'center',
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
  },
  chart: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    width: 36,
  },
  chartVal: {
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 0.5,
    width: 44,
    textAlign: 'right',
  },
  tableHead: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    backgroundColor: colors.surface2,
  },
  headCell: {
    flex: 1,
    fontFamily: fonts.sansSemiBold,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.ink2,
  },
  right: { textAlign: 'right' },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  cell: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.ink,
  },
  dateCell: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.ink2,
  },
  topSetCell: {
    fontSize: 15,
  },
  oneRMCell: {
    color: colors.good,
    fontFamily: fonts.display,
    fontSize: 13,
  },
  cellMuted: {
    color: colors.muted,
    fontSize: 11,
  },
});
