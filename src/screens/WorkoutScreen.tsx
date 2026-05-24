import React, { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, useWindowDimensions, Modal } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useWorkoutStore } from '@/store/workoutStore';
import { useHistoryStore } from '@/store/historyStore';
import { useUnitStore } from '@/store/unitStore';
import { exerciseById } from '@/data/exercises';
import { colors, fonts, border, tracking } from '@/theme/tokens';

import { Topbar } from '@/components/ui/Topbar';
import { IconBtn } from '@/components/ui/IconBtn';
import { SetMeter } from '@/components/workout/SetMeter';
import { ExTitleBlock } from '@/components/workout/ExTitleBlock';
import { ExerciseHistory } from '@/components/workout/ExerciseHistory';
import { TweakRow } from '@/components/workout/TweakRow';
import { ProgressRing } from '@/components/workout/ProgressRing';
import { StatsGrid } from '@/components/workout/StatsGrid';
import { RPESlider } from '@/components/workout/RPESlider';
import { WorkoutControls } from '@/components/workout/WorkoutControls';
import { ExercisePickerModal } from '@/components/workout/ExercisePickerModal';
import { WarmUpGuide } from '@/components/workout/WarmUpGuide';

import { fmtKg } from '@/utils/format';
import type { SetLog, WorkoutSession } from '@/types';

const BAR_WEIGHT_KG = 20;

function buildSessionFromStore(store: ReturnType<typeof useWorkoutStore.getState>): WorkoutSession | null {
  if (!store.sessionId || !store.template || !store.startedAt) return null;
  return {
    id: store.sessionId,
    templateId: store.template.id,
    templateName: store.template.name,
    startedAt: store.startedAt,
    exercises: store.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets
        .filter((s) => s.state === 'done')
        .map((s) => ({
          reps: s.reps,
          weightKg: s.weightKg,
          rpe: s.rpe,
          completedAt: new Date().toISOString(),
        })),
      targetSets: ex.sets.length,
      targetReps: ex.sets[0]?.reps ?? 0,
      targetWeightKg: ex.sets[0]?.weightKg ?? 0,
      note: store.exerciseNotes[ex.exerciseId] || undefined,
    })),
  };
}

function formatRestTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function WorkoutScreen() {
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const template = useWorkoutStore((s) => s.template);
  const exerciseIndex = useWorkoutStore((s) => s.exerciseIndex);
  const currentSetIndex = useWorkoutStore((s) => s.currentSetIndex);
  const exercises = useWorkoutStore((s) => s.exercises);
  const phase = useWorkoutStore((s) => s.phase);
  const elapsedSeconds = useWorkoutStore((s) => s.elapsedSeconds);
  const startedAt = useWorkoutStore((s) => s.startedAt);
  const sessionId = useWorkoutStore((s) => s.sessionId);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'swap' | 'add'>('swap');
  const [showOverview, setShowOverview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [prExName, setPRExName] = useState<string | null>(null);
  const prOpacity = useSharedValue(0);
  const prStyle = useAnimatedStyle(() => ({ opacity: prOpacity.value }));

  const restSlideY = useSharedValue(screenHeight);
  const restOverlayStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: restSlideY.value }],
  }));

  const triggerPRFlash = (name: string) => {
    setPRExName(name);
    prOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withDelay(1600, withTiming(0, { duration: 350 })),
    );
    setTimeout(() => setPRExName(null), 2200);
  };

  const restTarget = useWorkoutStore((s) => s.restTarget);
  const setRestTarget = useWorkoutStore((s) => s.setRestTarget);

  const isPaused = useWorkoutStore((s) => s.isPaused);
  const togglePause = useWorkoutStore((s) => s.togglePause);
  const exerciseNotes = useWorkoutStore((s) => s.exerciseNotes);
  const setExerciseNote = useWorkoutStore((s) => s.setExerciseNote);
  const undoLastSet = useWorkoutStore((s) => s.undoLastSet);
  const adjustReps = useWorkoutStore((s) => s.adjustReps);
  const adjustWeight = useWorkoutStore((s) => s.adjustWeight);
  const setRPE = useWorkoutStore((s) => s.setRPE);
  const completeSet = useWorkoutStore((s) => s.completeSet);
  const startNextSet = useWorkoutStore((s) => s.startNextSet);
  const swapExercise = useWorkoutStore((s) => s.swapExercise);
  const addSet = useWorkoutStore((s) => s.addSet);
  const addExercise = useWorkoutStore((s) => s.addExercise);
  const goToExercise = useWorkoutStore((s) => s.goToExercise);
  const tickTimer = useWorkoutStore((s) => s.tickTimer);

  const insets = useSafeAreaInsets();
  const unit = useUnitStore((s) => s.unit);
  const KG_TO_LB = 2.20462;

  const allSessions = useHistoryStore((s) => s.sessions);
  const previousSession = useHistoryStore((s) => s.previousSession);
  const addSession = useHistoryStore((s) => s.addSession);

  // Fade animation on phase change
  const fadeAnim = useSharedValue(1);
  const prevPhase = useRef(phase);
  useEffect(() => {
    if (prevPhase.current !== phase) {
      prevPhase.current = phase;
      fadeAnim.value = withSequence(
        withTiming(0, { duration: 120 }),
        withTiming(1, { duration: 200 }),
      );
    }
  }, [phase, fadeAnim]);

  // Rest overlay slides in from bottom
  useEffect(() => {
    restSlideY.value = withTiming(phase === 'rest' ? 0 : screenHeight, { duration: 320 });
  }, [phase, restSlideY, screenHeight]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));

  // Close history panel on exercise change
  useEffect(() => { setShowHistory(false); }, [exerciseIndex]);

  // Tick the timer every second — stops when paused
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => tickTimer(), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tickTimer, isPaused]);

  // Auto-advance when rest timer expires + haptic pulse
  useEffect(() => {
    if (phase === 'rest' && elapsedSeconds >= restTarget) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      startNextSet();
    }
  }, [phase, elapsedSeconds, restTarget, startNextSet]);

  if (!template || exercises.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: colors.ink, fontFamily: fonts.display, fontSize: 24, padding: 24 }}>
          No workout active
        </Text>
      </SafeAreaView>
    );
  }

  const activeEx = exercises[exerciseIndex];
  const currentSet = activeEx?.sets[currentSetIndex];
  const exercise = exerciseById(activeEx?.exerciseId ?? '');
  const totalExercises = exercises.length;

  // During rest, TweakRow shows and adjusts the UPCOMING set
  const upcomingSet = (() => {
    if (phase !== 'rest' || !activeEx) return null;
    if (currentSetIndex + 1 < activeEx.sets.length) return activeEx.sets[currentSetIndex + 1];
    const nextEx = exercises[exerciseIndex + 1];
    return nextEx?.sets[0] ?? null;
  })();
  const displaySet = phase === 'rest' ? upcomingSet : currentSet;
  const restRemaining = Math.max(0, restTarget - elapsedSeconds);
  const workoutElapsed = startedAt
    ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
    : 0;
  const currentVolumeKg = exercises.reduce((sum, ex) =>
    sum + ex.sets.filter((s) => s.state === 'done').reduce((s2, s) => s2 + s.weightKg * s.reps, 0), 0);

  // Get previous session data for this template
  const prev = sessionId ? previousSession(template.id, sessionId) : null;
  const prevEx = prev?.exercises.find((e) => e.exerciseId === activeEx?.exerciseId);
  const prevSets: SetLog[] = prevEx?.sets ?? [];

  // During rest, show next exercise if we're transitioning between exercises
  const isExerciseTransition = phase === 'rest' && currentSetIndex + 1 >= (activeEx?.sets.length ?? 0);
  const REST_PRESETS = [60, 90, 120, 180];
  const nextActiveEx = isExerciseTransition ? exercises[exerciseIndex + 1] : null;
  const nextExercise = nextActiveEx ? exerciseById(nextActiveEx.exerciseId) : null;
  const prevNextExSets = nextActiveEx && prev
    ? prev.exercises.find((e) => e.exerciseId === nextActiveEx.exerciseId)?.sets ?? []
    : [];
  const prevNextTopSet = prevNextExSets.length > 0
    ? prevNextExSets.reduce((best, s) => s.weightKg * s.reps > best.weightKg * best.reps ? s : best)
    : null;

  const prevTopSet = prevSets.length > 0
    ? prevSets.reduce((best, s) => s.weightKg * s.reps > best.weightKg * best.reps ? s : best)
    : null;
  const prevText = prevTopSet
    ? `${prevTopSet.reps} × ${fmtKg(prevTopSet.weightKg)} KG · ${prevSets.length} sets`
    : undefined;

  const suggestion = prevTopSet ? (() => {
    if (prevTopSet.rpe <= 7) return `→ Try ${fmtKg(prevTopSet.weightKg + 2.5)} kg`;
    if (prevTopSet.rpe === 8) return `→ Match ${prevTopSet.reps + 1} reps`;
    return `→ Match ${fmtKg(prevTopSet.weightKg)} kg`;
  })() : undefined;

  const handleApplySuggestion = prevTopSet && displaySet ? () => {
    if (prevTopSet.rpe <= 7) {
      adjustWeight((prevTopSet.weightKg + 2.5) - displaySet.weightKg);
    } else if (prevTopSet.rpe === 8) {
      adjustReps((prevTopSet.reps + 1) - displaySet.reps);
    } else {
      adjustWeight(prevTopSet.weightKg - displaySet.weightKg);
    }
  } : undefined;

  const handleFinish = () => {
    const state = useWorkoutStore.getState();
    const session = buildSessionFromStore(state);
    if (session) {
      addSession({ ...session, endedAt: new Date().toISOString() });
    }
    router.replace('/workout/summary');
  };

  const handlePrimaryPress = () => {
    if (phase === 'done') {
      handleFinish();
    } else if (phase === 'rest') {
      startNextSet();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const completingSet = currentSet;
      const completingExId = activeEx?.exerciseId;
      completeSet();
      // PR detection: check if this set's weight beats all-time best
      if (completingSet && completingExId && completingSet.weightKg > 0) {
        const allTimeMax = allSessions
          .flatMap((s) => s.exercises.filter((e) => e.exerciseId === completingExId).flatMap((e) => e.sets))
          .reduce((max, s) => Math.max(max, s.weightKg), 0);
        if (completingSet.weightKg > allTimeMax) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          triggerPRFlash(exercise?.name ?? 'Exercise');
        }
      }
      if (useWorkoutStore.getState().phase === 'done') {
        handleFinish();
      }
    }
  };

  const primaryLabel =
    phase === 'done' ? '✓ Finish'
    : phase === 'rest' ? '▶ Start Set'
    : '✓ Complete';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Topbar
          left={
            <IconBtn onPress={() => router.back()}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </IconBtn>
          }
          center={
            <TouchableOpacity onPress={() => setShowOverview(true)} activeOpacity={0.7}>
              <Text style={styles.sessionMeta}>
                <Text style={styles.sessionMetaAccent}>{exerciseIndex + 1}</Text>
                /{totalExercises}
                {'  ·  Set '}
                <Text style={styles.sessionMetaAccent}>
                  {Math.min(currentSetIndex + 1, activeEx?.sets.length ?? 1)}
                </Text>
                /{activeEx?.sets.length ?? 1}
              </Text>
            </TouchableOpacity>
          }
          right={
            <IconBtn onPress={togglePause}>
              {isPaused ? (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill={colors.accent} stroke="none">
                  <Path d="M8 5v14l11-7z" />
                </Svg>
              ) : (
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.5} strokeLinecap="square">
                  <Path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </Svg>
              )}
            </IconBtn>
          }
        />

        {activeEx && (
          <>
            <SetMeter sets={activeEx.sets} currentIndex={currentSetIndex} isRest={phase === 'rest'} />
            {phase === 'active' && (
              <TouchableOpacity
                style={styles.addSetBtn}
                onPress={() => addSet(exerciseIndex)}
                activeOpacity={0.7}
              >
                <Text style={styles.addSetLabel}>+ Set</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {exercise && (
          <ExTitleBlock
            startLetter={exercise.startLetter}
            name={exercise.name}
            previousText={prevText}
            suggestion={suggestion}
            onApplySuggestion={handleApplySuggestion}
            onSwap={() => { setPickerMode('swap'); setShowPicker(true); }}
            onHistory={() => setShowHistory((v) => !v)}
            historyActive={showHistory}
          />
        )}

        {showHistory && activeEx && (
          <ExerciseHistory exerciseId={activeEx.exerciseId} sessions={allSessions} />
        )}

        {phase === 'active' && currentSetIndex === 0 && currentSet && currentSet.weightKg > BAR_WEIGHT_KG && (
          <WarmUpGuide workingWeightKg={currentSet.weightKg} workingReps={currentSet.reps} />
        )}

        <Animated.View style={fadeStyle}>
          {displaySet && phase !== 'done' && (
            <TweakRow
              reps={displaySet.reps}
              weightKg={displaySet.weightKg}
              onAdjustReps={adjustReps}
              onAdjustWeight={adjustWeight}
              label={phase === 'rest' ? 'Next Set' : undefined}
            />
          )}

          {phase === 'done' && (
            <View style={styles.doneBanner}>
              <Text style={styles.doneBannerText}>All Sets Complete</Text>
            </View>
          )}

          <ProgressRing
            elapsedSeconds={elapsedSeconds}
            phase={phase}
            restTarget={restTarget}
            currentSet={currentSetIndex + 1}
            totalSets={activeEx?.sets.length ?? 1}
            isPaused={isPaused}
          />

          {phase === 'rest' && (
            <View style={styles.restPresets}>
              {REST_PRESETS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.presetBtn, restTarget === t && styles.presetBtnActive]}
                  onPress={() => setRestTarget(t)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.presetLabel, restTarget === t && styles.presetLabelActive]}>
                    {t < 120 ? `${t}s` : `${t / 60}m`}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.presetBtn, styles.undoBtn]}
                onPress={undoLastSet}
                activeOpacity={0.7}
              >
                <Text style={styles.undoBtnLabel}>↩ Undo</Text>
              </TouchableOpacity>
            </View>
          )}

          <StatsGrid
            previousSets={prevSets}
            restSeconds={phase === 'rest' ? restRemaining : 0}
            workoutSeconds={workoutElapsed}
            currentVolumeKg={currentVolumeKg}
          />

          {phase === 'rest' && nextExercise ? (
            <View style={styles.nextUpBlock}>
              <Text style={styles.nextUpLabel}>Next Exercise</Text>
              <Text style={styles.nextUpName}>
                {nextExercise.name.split(' ').slice(0, -1).join(' ')}{' '}
                <Text style={styles.nextUpNameAccent}>
                  {nextExercise.name.split(' ').slice(-1)[0].toUpperCase()}
                </Text>
              </Text>
              {prevNextTopSet ? (
                <Text style={styles.nextUpPrev}>
                  Last: {prevNextTopSet.reps} × {fmtKg(prevNextTopSet.weightKg)} KG
                  {'  ·  '}RPE {prevNextTopSet.rpe}
                </Text>
              ) : (
                <Text style={styles.nextUpPrev}>First time — go by feel</Text>
              )}
            </View>
          ) : phase !== 'rest' && currentSet ? (
            <>
              <RPESlider value={currentSet.rpe} onChange={setRPE} />
              {activeEx && (
                <View style={styles.noteWrap}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Note this exercise..."
                    placeholderTextColor={colors.muted}
                    value={exerciseNotes[activeEx.exerciseId] ?? ''}
                    onChangeText={(t) => setExerciseNote(activeEx.exerciseId, t)}
                    multiline
                    returnKeyType="done"
                    blurOnSubmit
                  />
                </View>
              )}
            </>
          ) : null}
        </Animated.View>

        <ExercisePickerModal
          visible={showPicker}
          mode={pickerMode}
          currentExerciseId={activeEx?.exerciseId ?? ''}
          onSelect={(id) => {
            if (pickerMode === 'add') {
              addExercise(id);
              // navigate after the store updates — useWorkoutStore.getState() is synchronous
              const newIdx = useWorkoutStore.getState().exercises.length - 1;
              goToExercise(newIdx);
            } else {
              swapExercise(exerciseIndex, id);
            }
          }}
          onClose={() => setShowPicker(false)}
        />

        <View style={styles.controlsWrap}>
          <WorkoutControls
            onPrev={() => goToExercise(exerciseIndex - 1)}
            onNext={() => goToExercise(exerciseIndex + 1)}
            onComplete={handlePrimaryPress}
            primaryLabel={primaryLabel}
            hasPrev={exerciseIndex > 0}
            hasNext={exerciseIndex < totalExercises - 1}
          />
          <TouchableOpacity
            style={styles.addExBtn}
            onPress={() => { setPickerMode('add'); setShowPicker(true); }}
            activeOpacity={0.7}
          >
            <Text style={styles.addExLabel}>＋ Add Exercise</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Full-screen rest overlay */}
      <Animated.View style={[styles.restOverlay, restOverlayStyle, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]} pointerEvents={phase === 'rest' ? 'auto' : 'none'}>
        <View style={styles.restTop}>
          <Text style={styles.restEyebrow}>● REST</Text>
          <Text style={styles.restCountdown}>{formatRestTime(restRemaining)}</Text>
          <Text style={styles.restSubtitle}>
            Set {Math.min(currentSetIndex + 1, activeEx?.sets.length ?? 1)}/{activeEx?.sets.length ?? 1} complete
          </Text>
        </View>

        {nextExercise ? (
          <View style={styles.restNextBlock}>
            <Text style={styles.restNextLabel}>Next Up</Text>
            <Text style={styles.restNextName}>
              {nextExercise.name.split(' ').slice(0, -1).join(' ')}{' '}
              <Text style={styles.restNextNameAccent}>
                {nextExercise.name.split(' ').slice(-1)[0].toUpperCase()}
              </Text>
            </Text>
            {prevNextTopSet ? (
              <Text style={styles.restNextPrev}>
                Last: {prevNextTopSet.reps} × {fmtKg(prevNextTopSet.weightKg)} KG · RPE {prevNextTopSet.rpe}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.restNextBlock}>
            <Text style={styles.restNextLabel}>Current Exercise</Text>
            <Text style={styles.restNextName}>
              {exercise?.name.split(' ').slice(0, -1).join(' ')}{' '}
              <Text style={styles.restNextNameAccent}>
                {(exercise?.name.split(' ').slice(-1)[0] ?? '').toUpperCase()}
              </Text>
            </Text>
          </View>
        )}

        {/* Next-set weight/reps adjuster */}
        {displaySet && (
          <View style={styles.restAdjust}>
            <View style={styles.restAdjustCell}>
              <Text style={styles.restAdjustLabel}>Reps</Text>
              <View style={styles.restAdjustRow}>
                <TouchableOpacity style={styles.restAdjBtn} onPress={() => adjustReps(-1)} activeOpacity={0.7}>
                  <Text style={styles.restAdjBtnLabel}>−</Text>
                </TouchableOpacity>
                <Text style={styles.restAdjVal}>{displaySet.reps}</Text>
                <TouchableOpacity style={styles.restAdjBtn} onPress={() => adjustReps(1)} activeOpacity={0.7}>
                  <Text style={styles.restAdjBtnLabel}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.restAdjDivider} />
            <View style={styles.restAdjustCell}>
              <Text style={styles.restAdjustLabel}>Weight</Text>
              <View style={styles.restAdjustRow}>
                <TouchableOpacity style={styles.restAdjBtn} onPress={() => adjustWeight(unit === 'lb' ? -(5 / KG_TO_LB) : -2.5)} activeOpacity={0.7}>
                  <Text style={styles.restAdjBtnLabel}>−</Text>
                </TouchableOpacity>
                <Text style={styles.restAdjVal}>
                  {fmtKg(unit === 'lb' ? displaySet.weightKg * KG_TO_LB : displaySet.weightKg)}
                  <Text style={styles.restAdjUnit}> {unit.toUpperCase()}</Text>
                </Text>
                <TouchableOpacity style={styles.restAdjBtn} onPress={() => adjustWeight(unit === 'lb' ? 5 / KG_TO_LB : 2.5)} activeOpacity={0.7}>
                  <Text style={styles.restAdjBtnLabel}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.restPresetRow}>
          {REST_PRESETS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.restPresetBtn, restTarget === t && styles.restPresetBtnActive]}
              onPress={() => setRestTarget(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.restPresetLabel, restTarget === t && styles.restPresetLabelActive]}>
                {t < 120 ? `${t}s` : `${t / 60}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.restActions}>
          <TouchableOpacity style={styles.restUndoBtn} onPress={undoLastSet} activeOpacity={0.7}>
            <Text style={styles.restUndoLabel}>↩ Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.restSkipBtn} onPress={startNextSet} activeOpacity={0.8}>
            <Text style={styles.restSkipLabel}>▶ Start Set</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Exercise overview sheet */}
      <Modal
        visible={showOverview}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOverview(false)}
      >
        <TouchableOpacity
          style={styles.overviewBackdrop}
          activeOpacity={1}
          onPress={() => setShowOverview(false)}
        />
        <View style={styles.overviewSheet}>
          <View style={styles.overviewHandle} />
          <Text style={styles.overviewTitle}>Workout Overview</Text>
          <ScrollView contentContainerStyle={styles.overviewList} showsVerticalScrollIndicator={false}>
            {exercises.map((ex, idx) => {
              const exDef = exerciseById(ex.exerciseId);
              const doneSets = ex.sets.filter((s) => s.state === 'done').length;
              const totalS = ex.sets.length;
              const isCurrent = idx === exerciseIndex;
              const isAllDone = doneSets === totalS;
              return (
                <TouchableOpacity
                  key={ex.exerciseId + idx}
                  style={[styles.overviewRow, isCurrent && styles.overviewRowCurrent]}
                  onPress={() => { goToExercise(idx); setShowOverview(false); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.overviewIdx, isCurrent && styles.overviewIdxCurrent, isAllDone && styles.overviewIdxDone]}>
                    <Text style={[styles.overviewIdxText, isCurrent && styles.overviewIdxTextCurrent, isAllDone && styles.overviewIdxTextDone]}>
                      {isAllDone ? '✓' : String(idx + 1).padStart(2, '0')}
                    </Text>
                  </View>
                  <View style={styles.overviewMid}>
                    <Text style={[styles.overviewName, isCurrent && styles.overviewNameCurrent, isAllDone && styles.overviewNameDone]}>
                      {(exDef?.name ?? ex.exerciseId).toUpperCase()}
                    </Text>
                    <Text style={styles.overviewSets}>
                      {doneSets}/{totalS} sets
                    </Text>
                  </View>
                  <View style={styles.overviewDots}>
                    {ex.sets.map((s, si) => (
                      <View
                        key={si}
                        style={[
                          styles.overviewDot,
                          s.state === 'done' && styles.overviewDotDone,
                          si === currentSetIndex && isCurrent && styles.overviewDotCurrent,
                        ]}
                      />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* PR flash overlay */}
      {prExName && (
        <Animated.View style={[styles.prOverlay, prStyle]} pointerEvents="none">
          <View style={styles.prCard}>
            <Text style={styles.prCardEyebrow}>↑ New Record</Text>
            <Text style={styles.prCardTitle}>{prExName.split(' ').slice(0, -1).join(' ')}{' '}
              <Text style={styles.prCardAccent}>{prExName.split(' ').slice(-1)[0].toUpperCase()}</Text>
            </Text>
          </View>
        </Animated.View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  sessionMeta: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  sessionMetaAccent: {
    color: colors.accent,
    fontFamily: fonts.sansSemiBold,
  },
  controlsWrap: {
    marginTop: 16,
  },
  addSetBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 2,
    marginBottom: -4,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  addSetLabel: {
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: tracking.wide,
    color: colors.muted,
  },
  addExBtn: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  addExLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.ink2,
  },
  doneBanner: {
    borderWidth: border.heavy,
    borderColor: colors.good,
    paddingVertical: 10,
    alignItems: 'center',
    marginVertical: 8,
  },
  doneBannerText: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.good,
  },
  restPresets: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  presetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: border.light,
    borderColor: colors.ink,
  },
  presetBtnActive: {
    backgroundColor: colors.ink,
  },
  presetLabel: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: tracking.wide,
    color: colors.ink,
  },
  presetLabelActive: {
    color: colors.bg,
  },
  undoBtn: {
    borderColor: colors.muted,
    marginLeft: 4,
  },
  undoBtnLabel: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: tracking.wide,
    color: colors.muted,
  },
  prOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  prCard: {
    backgroundColor: colors.ink,
    paddingHorizontal: 28,
    paddingVertical: 18,
    alignItems: 'center',
  },
  prCardEyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 4,
  },
  prCardTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.bg,
    lineHeight: 28,
  },
  prCardAccent: {
    fontStyle: 'italic',
    color: colors.accent,
  },
  nextUpBlock: {
    marginTop: 10,
    borderWidth: 2,
    borderColor: colors.ink,
    padding: 12,
    paddingHorizontal: 14,
  },
  nextUpLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 8,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 4,
  },
  nextUpName: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
    lineHeight: 24,
  },
  nextUpNameAccent: {
    fontStyle: 'italic',
    color: colors.accent,
  },
  nextUpPrev: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 6,
  },
  noteWrap: {
    borderWidth: 1,
    borderColor: colors.lineSoft,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  noteInput: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 18,
    minHeight: 20,
  },

  restOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  restTop: {
    alignItems: 'flex-start',
  },
  restEyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 8,
  },
  restCountdown: {
    fontFamily: fonts.display,
    fontSize: 96,
    lineHeight: 82,
    letterSpacing: 2,
    color: colors.bg,
  },
  restSubtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: 'rgba(245,240,225,0.4)',
    marginTop: 8,
  },
  restNextBlock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(245,240,225,0.15)',
    paddingTop: 16,
  },
  restNextLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 6,
  },
  restNextName: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 30,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.bg,
  },
  restNextNameAccent: {
    fontStyle: 'italic',
    color: colors.accent,
  },
  restNextPrev: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: 'rgba(245,240,225,0.45)',
    marginTop: 6,
  },
  restAdjust: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(245,240,225,0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,240,225,0.12)',
    marginBottom: 14,
  },
  restAdjustCell: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 8,
  },
  restAdjDivider: {
    width: 1,
    backgroundColor: 'rgba(245,240,225,0.12)',
  },
  restAdjustLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: 'rgba(245,240,225,0.4)',
  },
  restAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restAdjBtn: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: 'rgba(245,240,225,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restAdjBtnLabel: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.bg,
    lineHeight: 22,
  },
  restAdjVal: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 0.5,
    color: colors.bg,
    minWidth: 44,
    textAlign: 'center',
  },
  restAdjUnit: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: 'rgba(245,240,225,0.5)',
  },
  restPresetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  restPresetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,240,225,0.2)',
    alignItems: 'center',
  },
  restPresetBtnActive: {
    backgroundColor: 'rgba(245,240,225,0.12)',
    borderColor: colors.bg,
  },
  restPresetLabel: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: tracking.wide,
    color: 'rgba(245,240,225,0.5)',
  },
  restPresetLabelActive: {
    color: colors.bg,
  },
  restActions: {
    flexDirection: 'row',
    gap: 10,
  },
  restUndoBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,240,225,0.2)',
    alignItems: 'center',
  },
  restUndoLabel: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: tracking.wide,
    color: 'rgba(245,240,225,0.5)',
  },
  restSkipBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  restSkipLabel: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: tracking.max,
    textTransform: 'uppercase',
    color: colors.bg,
  },

  overviewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overviewSheet: {
    backgroundColor: colors.bg,
    borderTopWidth: border.heavy,
    borderTopColor: colors.ink,
    maxHeight: '75%',
  },
  overviewHandle: {
    width: 32,
    height: 3,
    backgroundColor: colors.ink2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  overviewTitle: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.ink,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: border.heavy,
    borderBottomColor: colors.ink,
  },
  overviewList: { paddingHorizontal: 20 },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  overviewRowCurrent: {
    backgroundColor: 'rgba(200,65,42,0.04)',
  },
  overviewIdx: {
    width: 28,
    height: 28,
    borderWidth: border.heavy,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewIdxCurrent: { borderColor: colors.accent },
  overviewIdxDone: { borderColor: colors.ink, backgroundColor: colors.ink },
  overviewIdxText: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.ink,
  },
  overviewIdxTextCurrent: { color: colors.accent },
  overviewIdxTextDone: { color: colors.bg },
  overviewMid: { flex: 1 },
  overviewName: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
    lineHeight: 16,
  },
  overviewNameCurrent: { color: colors.accent },
  overviewNameDone: { color: colors.muted, textDecorationLine: 'line-through' },
  overviewSets: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 2,
  },
  overviewDots: {
    flexDirection: 'row',
    gap: 3,
  },
  overviewDot: {
    width: 6,
    height: 6,
    backgroundColor: colors.lineSoft,
  },
  overviewDotDone: { backgroundColor: colors.ink },
  overviewDotCurrent: { backgroundColor: colors.accent },
});
