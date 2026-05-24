import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors, fonts, border, tracking } from '@/theme/tokens';
import { fmtKg } from '@/utils/format';
import { useUnitStore } from '@/store/unitStore';

const KG_TO_LB = 2.20462;

// ── Barbell SVG ─────────────────────────────────────────────────────────────
const VB_W = 320;
const VB_H = 64;
const BAR_Y = 32;
const COL_H = 30;
const COL_W = 5;
const COL_L = 90;
const COL_R = 225;

// plate height and width in SVG units — indexed by plate size in display unit
const PH_KG: Record<number, number> = {
  25: 58, 20: 50, 15: 42, 10: 34, 7.5: 28, 5: 22, 2.5: 18, 1.25: 14,
};
const PW_KG: Record<number, number> = {
  25: 14, 20: 12, 15: 11, 10: 9, 7.5: 8, 5: 7, 2.5: 6, 1.25: 5,
};
const PH_LB: Record<number, number> = {
  45: 58, 35: 50, 25: 42, 10: 32, 5: 22, 2.5: 16,
};
const PW_LB: Record<number, number> = {
  45: 14, 35: 12, 25: 10, 10: 8, 5: 6, 2.5: 5,
};

function BarbellViz({ plates, isLb }: { plates: { size: number; count: number }[]; isLb: boolean }) {
  const stack = plates.flatMap((p) => Array(p.count).fill(p.size));
  let lx = COL_L;
  let rx = COL_R + COL_W;
  const lRects: React.ReactElement[] = [];
  const rRects: React.ReactElement[] = [];
  const phMap = isLb ? PH_LB : PH_KG;
  const pwMap = isLb ? PW_LB : PW_KG;
  stack.forEach((size, i) => {
    const w = pwMap[size] ?? 7;
    const h = phMap[size] ?? 16;
    const py = BAR_Y - h / 2;
    lx -= w;
    lRects.push(
      <Rect key={`l${i}`} x={lx} y={py} width={w} height={h}
        fill={colors.ink} stroke={colors.bg} strokeWidth={0.5} />,
    );
    rRects.push(
      <Rect key={`r${i}`} x={rx} y={py} width={w} height={h}
        fill={colors.ink} stroke={colors.bg} strokeWidth={0.5} />,
    );
    rx += w;
  });
  return (
    <Svg width="100%" height={VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Rect x={0} y={BAR_Y - 1.5} width={VB_W} height={3} fill={colors.ink} />
      <Rect x={COL_L + COL_W} y={BAR_Y - 1} width={COL_R - COL_L - COL_W} height={2} fill={colors.ink2} />
      {lRects}
      {rRects}
      <Rect x={COL_L} y={BAR_Y - COL_H / 2} width={COL_W} height={COL_H} fill={colors.accent} />
      <Rect x={COL_R} y={BAR_Y - COL_H / 2} width={COL_W} height={COL_H} fill={colors.accent} />
    </Svg>
  );
}

type Props = {
  reps: number;
  weightKg: number;
  onAdjustReps: (delta: number) => void;
  onAdjustWeight: (deltaKg: number) => void;
  label?: string;
};

const WEIGHT_STEPS_KG = [0.5, 1, 2.5, 5];
const WEIGHT_STEPS_LB = [2.5, 5, 10, 25];
const BAR_KG_OPTIONS = [15, 17.5, 20];
// standard lb bars stored as their kg equivalents
const BAR_LB_KG = [35 / KG_TO_LB, 45 / KG_TO_LB];
const PLATE_SIZES_KG = [25, 20, 15, 10, 7.5, 5, 2.5, 1.25];
const PLATE_SIZES_LB = [45, 35, 25, 10, 5, 2.5];

function calcPlates(total: number, bar: number, plateSizes: number[]): { size: number; count: number }[] {
  const perSide = (total - bar) / 2;
  if (perSide <= 0) return [];
  let rem = perSide;
  const result: { size: number; count: number }[] = [];
  for (const p of plateSizes) {
    if (rem >= p) {
      const n = Math.floor(Math.round(rem / p * 100) / 100);
      if (n > 0) { result.push({ size: p, count: n }); rem = Math.round((rem - n * p) * 100) / 100; }
    }
  }
  return result;
}

function Cell({
  label,
  value,
  unitLabel,
  displayValue,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  unitLabel?: string;
  displayValue?: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.cell}>
      <View>
        <Text style={styles.cellLabel}>{label}</Text>
        <Text style={styles.cellValue}>
          {displayValue ?? value}
          {unitLabel ? <Text style={styles.unit}> {unitLabel}</Text> : null}
        </Text>
      </View>
      <View style={styles.pm}>
        <TouchableOpacity style={styles.pmBtn} onPress={onMinus} activeOpacity={0.7}>
          <Text style={styles.pmLabel}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pmBtn} onPress={onPlus} activeOpacity={0.7}>
          <Text style={styles.pmLabel}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function TweakRow({ reps, weightKg, onAdjustReps, onAdjustWeight, label }: Props) {
  const unit = useUnitStore((s) => s.unit);
  const isLb = unit === 'lb';

  const [weightStep, setWeightStep] = useState(isLb ? 5 : 2.5);
  const [barKg, setBarKg] = useState(isLb ? 45 / KG_TO_LB : 20);

  // Reset step and bar to sensible defaults when unit changes
  useEffect(() => {
    setWeightStep(isLb ? 5 : 2.5);
    setBarKg(isLb ? 45 / KG_TO_LB : 20);
  }, [isLb]);

  const displayWeight = isLb ? weightKg * KG_TO_LB : weightKg;
  const displayBar = isLb ? barKg * KG_TO_LB : barKg;
  const plateSizes = isLb ? PLATE_SIZES_LB : PLATE_SIZES_KG;
  const weightSteps = isLb ? WEIGHT_STEPS_LB : WEIGHT_STEPS_KG;
  const plates = calcPlates(displayWeight, displayBar, plateSizes);

  const handleCycleBar = () => {
    const opts = isLb ? BAR_LB_KG : BAR_KG_OPTIONS;
    setBarKg((b) => {
      const closest = opts.reduce((prev, curr) =>
        Math.abs(curr - b) < Math.abs(prev - b) ? curr : prev,
      );
      const i = opts.indexOf(closest);
      return opts[(i + 1) % opts.length];
    });
  };

  return (
    <View style={styles.wrap}>
      {label && (
        <View style={styles.labelStrip}>
          <Text style={styles.labelText}>{label.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.cells}>
        <Cell
          label="Reps"
          value={reps}
          displayValue={String(reps)}
          onMinus={() => onAdjustReps(-1)}
          onPlus={() => onAdjustReps(1)}
        />
        <View style={styles.divider} />
        <Cell
          label="Weight"
          value={weightKg}
          unitLabel={unit.toUpperCase()}
          displayValue={fmtKg(displayWeight)}
          onMinus={() => onAdjustWeight(isLb ? -(weightStep / KG_TO_LB) : -weightStep)}
          onPlus={() => onAdjustWeight(isLb ? weightStep / KG_TO_LB : weightStep)}
        />
      </View>
      {weightKg > 0 && reps > 0 && (
        <View style={styles.oneRMStrip}>
          <Text style={styles.oneRMLabel}>Est. 1RM</Text>
          <Text style={styles.oneRMValue}>
            {fmtKg(Math.round((displayWeight * (1 + reps / 30)) / (isLb ? 5 : 2.5)) * (isLb ? 5 : 2.5))}
            <Text style={styles.oneRMUnit}> {unit.toUpperCase()}</Text>
          </Text>
        </View>
      )}

      <View style={styles.stepStrip}>
        <Text style={styles.stepStripLabel}>Step</Text>
        <View style={styles.stepBtns}>
          {weightSteps.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.stepBtn, weightStep === s && styles.stepBtnActive]}
              onPress={() => setWeightStep(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepLabel, weightStep === s && styles.stepLabelActive]}>
                {fmtKg(s)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {plates.length > 0 && (
        <>
          <View style={styles.barbellStrip}>
            <BarbellViz plates={plates} isLb={isLb} />
          </View>
          <View style={styles.platesStrip}>
            <TouchableOpacity onPress={handleCycleBar} activeOpacity={0.7}>
              <Text style={styles.barLabel}>
                Bar {fmtKg(displayBar)}{unit} ↻
              </Text>
            </TouchableOpacity>
            <View style={styles.platesChips}>
              {plates.map((p, i) => (
                <View key={i} style={styles.plateChip}>
                  <Text style={styles.plateChipText}>
                    {p.count > 1 ? `${p.count}×` : ''}{fmtKg(p.size)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: border.heavy,
    borderColor: colors.ink,
    marginVertical: 12,
  },
  cells: {
    flexDirection: 'row',
  },
  labelStrip: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  labelText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 8,
    letterSpacing: tracking.widest,
    color: colors.accent,
  },
  cell: {
    flex: 1,
    padding: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    width: border.heavy,
    backgroundColor: colors.ink,
  },
  cellLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.ink2,
  },
  cellValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 1,
    color: colors.ink,
    lineHeight: 26,
    marginTop: 2,
  },
  unit: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1,
  },
  pm: {
    flexDirection: 'row',
    gap: 4,
  },
  pmBtn: {
    width: 28,
    height: 28,
    borderWidth: border.light,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  pmLabel: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
    lineHeight: 22,
  },
  stepStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 10,
  },
  stepStripLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  stepBtns: {
    flexDirection: 'row',
    gap: 4,
  },
  stepBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  stepBtnActive: {
    backgroundColor: colors.ink,
  },
  stepLabel: {
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: tracking.wide,
    color: colors.ink,
  },
  stepLabelActive: {
    color: colors.bg,
  },
  oneRMStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.surface2,
  },
  oneRMLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  oneRMValue: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.ink,
  },
  oneRMUnit: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    color: colors.muted,
  },
  barbellStrip: {
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: colors.surface2,
  },
  platesStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 10,
  },
  barLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  platesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  plateChip: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    backgroundColor: colors.ink,
  },
  plateChipText: {
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: tracking.wide,
    color: colors.bg,
  },
});
