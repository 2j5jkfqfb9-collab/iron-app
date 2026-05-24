import React, { useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { EXERCISES } from '@/data/exercises';
import { useWorkoutStore } from '@/store/workoutStore';
import { useHistoryStore } from '@/store/historyStore';
import { useUnitStore } from '@/store/unitStore';
import { colors, fonts, border, tracking } from '@/theme/tokens';

const KG_TO_LB = 2.20462;
import { Topbar } from '@/components/ui/Topbar';
import { IconBtn } from '@/components/ui/IconBtn';
import { fmtKg } from '@/utils/format';
import type { MuscleGroup, WorkoutTemplate } from '@/types';

const GROUP_LABELS: Record<MuscleGroup, string> = {
  lower: 'Lower', push: 'Push', pull: 'Pull',
  upper: 'Upper', core: 'Core', mobility: 'Mobility',
};
const GROUPS: MuscleGroup[] = ['lower', 'push', 'pull', 'upper', 'core', 'mobility'];

type BuildExercise = {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  startWeightKg: number;
};

type Phase = 'select' | 'configure';

function Stepper({
  value, displayValue, onMinus, onPlus,
}: { value: number; displayValue?: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={st.stepper}>
      <TouchableOpacity style={st.stepBtn} onPress={onMinus} activeOpacity={0.7}>
        <Text style={st.stepBtnLabel}>−</Text>
      </TouchableOpacity>
      <Text style={st.stepVal}>{displayValue ?? String(value)}</Text>
      <TouchableOpacity style={st.stepBtn} onPress={onPlus} activeOpacity={0.7}>
        <Text style={st.stepBtnLabel}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function BuilderScreen() {
  const router = useRouter();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const [phase, setPhase] = useState<Phase>('select');
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<MuscleGroup | null>(null);
  const [selected, setSelected] = useState<BuildExercise[]>([]);
  const [workoutName, setWorkoutName] = useState('');
  const unit = useUnitStore((s) => s.unit);
  const allSessions = useHistoryStore((s) => s.sessions);

  const lookupLastWeight = (exerciseId: string): number | null => {
    for (const session of allSessions) {
      const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        const best = ex.sets.reduce((max, s) => s.weightKg > max.weightKg ? s : max);
        if (best.weightKg > 0) return best.weightKg;
      }
    }
    return null;
  };

  const lookupWeight = (exerciseId: string): number => lookupLastWeight(exerciseId) ?? 40;

  // ── SELECT PHASE ─────────────────────────────────────────────────────────
  const selectedIds = new Set(selected.map((e) => e.exerciseId));

  const filtered = EXERCISES.filter((e) => {
    if (activeGroup && e.muscleGroup !== activeGroup) return false;
    if (query.trim()) return e.name.toLowerCase().includes(query.toLowerCase());
    return true;
  });

  const grouped = GROUPS.flatMap((g) => {
    const exs = filtered.filter((e) => e.muscleGroup === g);
    if (exs.length === 0) return [];
    return [
      { type: 'header' as const, group: g },
      ...exs.map((e) => ({ type: 'item' as const, ...e })),
    ];
  });

  const toggle = (id: string) => {
    if (selectedIds.has(id)) {
      setSelected((s) => s.filter((e) => e.exerciseId !== id));
    } else {
      setSelected((s) => [
        ...s,
        { exerciseId: id, targetSets: 3, targetReps: 10, startWeightKg: lookupWeight(id) },
      ]);
    }
  };

  // ── CONFIGURE PHASE ──────────────────────────────────────────────────────
  const moveUp = (id: string) => {
    setSelected((s) => {
      const idx = s.findIndex((e) => e.exerciseId === id);
      if (idx <= 0) return s;
      const next = [...s];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (id: string) => {
    setSelected((s) => {
      const idx = s.findIndex((e) => e.exerciseId === id);
      if (idx < 0 || idx >= s.length - 1) return s;
      const next = [...s];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const update = (id: string, field: keyof Omit<BuildExercise, 'exerciseId'>, delta: number) => {
    setSelected((s) =>
      s.map((e) =>
        e.exerciseId !== id ? e : {
          ...e,
          [field]: Math.max(field === 'startWeightKg' ? 0 : 1, e[field] + delta),
        },
      ),
    );
  };

  const handleStart = () => {
    if (selected.length === 0) return;
    const template: WorkoutTemplate = {
      id: `custom-${Date.now()}`,
      name: workoutName.trim() || 'Custom Workout',
      muscleGroup: 'upper',
      estimatedMinutes: selected.length * 8,
      exercises: selected.map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        startWeightKg: e.startWeightKg,
      })),
    };
    startWorkout(template);
    router.replace(`/workout/${template.id}` as '/workout/[id]');
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (phase === 'configure') {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Topbar
          left={
            <IconBtn onPress={() => setPhase('select')}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </IconBtn>
          }
          center={<Text style={st.topbarTitle}>Configure</Text>}
          right={<View style={{ width: 36 }} />}
        />

        <ScrollView contentContainerStyle={st.configContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={st.configHeadline}>
            {selected.length} <Text style={st.configHeadlineAccent}>Exercise{selected.length !== 1 ? 's' : ''}</Text>
          </Text>

          {/* Workout name */}
          <View style={st.nameInput}>
            <Text style={st.nameInputLabel}>Workout Name</Text>
            <TextInput
              style={st.nameInputField}
              placeholder="Custom Workout"
              placeholderTextColor={colors.muted}
              value={workoutName}
              onChangeText={setWorkoutName}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          {selected.map((item, idx) => {
            const ex = EXERCISES.find((e) => e.id === item.exerciseId);
            return (
              <View key={item.exerciseId} style={st.configRow}>
                <View style={st.configExHeader}>
                  <View style={st.letterBox}>
                    <Text style={st.letter}>{ex?.startLetter ?? '?'}</Text>
                  </View>
                  <Text style={st.configExName} numberOfLines={1}>
                    {(ex?.name ?? item.exerciseId).toUpperCase()}
                  </Text>
                  <View style={st.moveButtons}>
                    <TouchableOpacity
                      onPress={() => moveUp(item.exerciseId)}
                      activeOpacity={0.7}
                      disabled={idx === 0}
                      style={st.moveBtn}
                    >
                      <Text style={[st.moveBtnLabel, idx === 0 && st.moveBtnDisabled]}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveDown(item.exerciseId)}
                      activeOpacity={0.7}
                      disabled={idx === selected.length - 1}
                      style={st.moveBtn}
                    >
                      <Text style={[st.moveBtnLabel, idx === selected.length - 1 && st.moveBtnDisabled]}>↓</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelected((s) => s.filter((e) => e.exerciseId !== item.exerciseId))}
                    activeOpacity={0.7}
                    style={st.removeBtn}
                  >
                    <Text style={st.removeBtnLabel}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={st.configFields}>
                  <View style={st.configField}>
                    <Text style={st.configFieldLabel}>Sets</Text>
                    <Stepper
                      value={item.targetSets}
                      onMinus={() => update(item.exerciseId, 'targetSets', -1)}
                      onPlus={() => update(item.exerciseId, 'targetSets', 1)}
                    />
                  </View>
                  <View style={st.configFieldDiv} />
                  <View style={st.configField}>
                    <Text style={st.configFieldLabel}>Reps</Text>
                    <Stepper
                      value={item.targetReps}
                      onMinus={() => update(item.exerciseId, 'targetReps', -1)}
                      onPlus={() => update(item.exerciseId, 'targetReps', 1)}
                    />
                  </View>
                  <View style={st.configFieldDiv} />
                  <View style={[st.configField, { flex: 1.4 }]}>
                    <Text style={st.configFieldLabel}>
                      Weight ({unit.toUpperCase()})
                    </Text>
                    <Stepper
                      value={item.startWeightKg}
                      displayValue={fmtKg(unit === 'lb' ? item.startWeightKg * KG_TO_LB : item.startWeightKg)}
                      onMinus={() => update(item.exerciseId, 'startWeightKg', unit === 'lb' ? -(5 / KG_TO_LB) : -2.5)}
                      onPlus={() => update(item.exerciseId, 'startWeightKg', unit === 'lb' ? 5 / KG_TO_LB : 2.5)}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={st.startWrap}>
          <TouchableOpacity style={st.startBtn} onPress={handleStart} activeOpacity={0.8}>
            <Text style={st.startBtnLabel}>▶ Start Workout</Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // SELECT PHASE
  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <Topbar
        left={
          <IconBtn onPress={() => router.back()}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </IconBtn>
        }
        center={<Text style={st.topbarTitle}>Build Workout</Text>}
        right={
          selected.length > 0 ? (
            <TouchableOpacity style={st.nextBtn} onPress={() => setPhase('configure')} activeOpacity={0.8}>
              <Text style={st.nextBtnLabel}>{selected.length} →</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 36 }} />
        }
      />

      {/* Search */}
      <View style={st.searchWrap}>
        <TextInput
          style={st.search}
          placeholder="Search exercises..."
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      {/* Group pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.pills}
      >
        <TouchableOpacity
          style={[st.pill, activeGroup === null && st.pillActive]}
          onPress={() => setActiveGroup(null)}
          activeOpacity={0.7}
        >
          <Text style={[st.pillLabel, activeGroup === null && st.pillLabelActive]}>All</Text>
        </TouchableOpacity>
        {GROUPS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[st.pill, activeGroup === g && st.pillActive]}
            onPress={() => setActiveGroup(activeGroup === g ? null : g)}
            activeOpacity={0.7}
          >
            <Text style={[st.pillLabel, activeGroup === g && st.pillLabelActive]}>
              {GROUP_LABELS[g]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={grouped}
        keyExtractor={(item) => item.type === 'header' ? `h-${item.group}` : item.id}
        contentContainerStyle={st.list}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={st.groupHeader}>
                <Text style={st.groupLabel}>{GROUP_LABELS[item.group]}</Text>
              </View>
            );
          }
          const isSelected = selectedIds.has(item.id);
          const lastW = lookupLastWeight(item.id);
          const lastWDisplay = lastW !== null
            ? `${fmtKg(unit === 'lb' ? lastW * KG_TO_LB : lastW)}${unit.toUpperCase()}`
            : null;
          return (
            <TouchableOpacity
              style={[st.row, isSelected && st.rowSelected]}
              onPress={() => toggle(item.id)}
              activeOpacity={0.7}
            >
              <View style={[st.letterBox, isSelected && st.letterBoxSelected]}>
                <Text style={[st.letter, isSelected && st.letterSelected]}>
                  {isSelected ? '✓' : item.startLetter}
                </Text>
              </View>
              <View style={st.exInfo}>
                <Text style={[st.exName, isSelected && st.exNameSelected]}>
                  {item.name.toUpperCase()}
                </Text>
                {lastWDisplay && (
                  <Text style={st.lastWeightHint}>{lastWDisplay}</Text>
                )}
              </View>
              <Text style={st.groupChip}>{GROUP_LABELS[item.muscleGroup]}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  topbarTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.ink2,
  },

  nextBtn: {
    borderWidth: border.heavy,
    borderColor: colors.accent,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.accent,
  },
  nextBtnLabel: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: tracking.wide,
    color: colors.bg,
  },

  searchWrap: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  search: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.ink,
    borderWidth: border.heavy,
    borderColor: colors.ink,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  pills: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: border.heavy,
    borderColor: colors.ink,
  },
  pillActive: { backgroundColor: colors.ink },
  pillLabel: {
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  pillLabelActive: { color: colors.bg },

  list: { paddingHorizontal: 22, paddingBottom: 40 },
  groupHeader: {
    paddingTop: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    marginBottom: 2,
  },
  groupLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  rowSelected: { backgroundColor: 'rgba(200,65,42,0.04)' },
  letterBox: {
    width: 32,
    height: 32,
    borderWidth: border.heavy,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBoxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  letter: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.ink,
  },
  letterSelected: { color: colors.bg, fontSize: 13 },
  exInfo: {
    flex: 1,
    gap: 2,
  },
  exName: {
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 1,
    color: colors.ink,
  },
  exNameSelected: { color: colors.accent },
  lastWeightHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    color: colors.accent,
  },
  groupChip: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
  },

  // Configure phase
  configContent: { paddingHorizontal: 22, paddingBottom: 100, paddingTop: 4 },
  configHeadline: {
    fontFamily: fonts.display,
    fontSize: 48,
    letterSpacing: 1,
    color: colors.ink,
    marginBottom: 16,
    marginTop: 6,
  },
  configHeadlineAccent: { fontStyle: 'italic', color: colors.accent },
  configRow: {
    borderWidth: border.heavy,
    borderColor: colors.ink,
    marginBottom: 10,
  },
  configExHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  configExName: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1,
    color: colors.ink,
    flex: 1,
  },
  moveButtons: {
    flexDirection: 'row',
    gap: 2,
  },
  moveBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  moveBtnLabel: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.ink2,
    lineHeight: 16,
  },
  moveBtnDisabled: { color: colors.lineSoft },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnLabel: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.muted,
  },
  configFields: {
    flexDirection: 'row',
  },
  configField: {
    flex: 1,
    padding: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  configFieldDiv: {
    width: border.heavy,
    backgroundColor: colors.lineSoft,
  },
  configFieldLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnLabel: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 20,
  },
  stepVal: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 0.5,
    color: colors.ink,
    minWidth: 32,
    textAlign: 'center',
  },

  startWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.bg,
    borderTopWidth: border.heavy,
    borderTopColor: colors.ink,
  },
  startBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startBtnLabel: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: tracking.max,
    textTransform: 'uppercase',
    color: colors.bg,
  },

  nameInput: {
    borderWidth: border.heavy,
    borderColor: colors.ink,
    padding: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  nameInputLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 4,
  },
  nameInputField: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.ink,
    paddingVertical: 2,
  },
});
