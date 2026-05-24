import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '@/store/workoutStore';
import { useHistoryStore } from '@/store/historyStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { TEMPLATES } from '@/data/templates';
import { exerciseById } from '@/data/exercises';
import { colors, fonts, border, tracking } from '@/theme/tokens';
import { fmtKg } from '@/utils/format';
import { Topbar } from '@/components/ui/Topbar';
import { useUnitStore } from '@/store/unitStore';
import type { WorkoutSession, WorkoutTemplate } from '@/types';

const KG_TO_LB = 2.20462;

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MUSCLE_GROUPS = ['lower', 'push', 'pull', 'upper', 'core', 'mobility'] as const;
const GROUP_LABELS: Record<string, string> = {
  lower: 'Lower', push: 'Push', pull: 'Pull',
  upper: 'Upper', core: 'Core', mobility: 'Mobility',
};
// full recovery thresholds in hours
const RECOVERY_H: Record<string, number> = {
  lower: 72, push: 48, pull: 48, upper: 48, core: 24, mobility: 12,
};

function getMuscleRecovery(sessions: WorkoutSession[]): Record<string, number> {
  // returns hours since last trained per group
  const now = Date.now();
  const last: Record<string, number> = {};
  for (const session of sessions) {
    const ms = new Date(session.startedAt).getTime();
    for (const ex of session.exercises) {
      const exercise = exerciseById(ex.exerciseId);
      if (!exercise) continue;
      const g = exercise.muscleGroup;
      if (!last[g] || ms > last[g]) last[g] = ms;
    }
  }
  const result: Record<string, number> = {};
  for (const [g, ms] of Object.entries(last)) {
    result[g] = Math.floor((now - ms) / 3_600_000);
  }
  return result;
}

function formatDate(): string {
  const now = new Date();
  const day = now.toLocaleDateString('en-GB', { weekday: 'long' });
  const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return `${day} · ${date}`;
}

function formatWeekLabel(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  const month = now.toLocaleDateString('en-GB', { month: 'short' });
  return `Week ${week} · ${month} '${String(now.getFullYear()).slice(2)}`;
}

// Mon=0 .. Sun=6
function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

function computeStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  const DAY = 86400000;
  const uniqueDays = [...new Set(
    sessions.map((s) => {
      const d = new Date(s.startedAt);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }),
  )].sort((a, b) => b - a);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (uniqueDays[0] < today.getTime() - DAY) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    if (uniqueDays[i - 1] - uniqueDays[i] === DAY) streak++;
    else break;
  }
  return streak;
}

function getDoneTemplatesThisWeek(sessions: WorkoutSession[]): Set<string> {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const monTime = monday.getTime();
  const ids = new Set<string>();
  sessions.forEach((s) => {
    const d = new Date(s.startedAt);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() >= monTime) ids.add(s.templateId);
  });
  return ids;
}

function getWeekDoneDays(sessions: WorkoutSession[]): number[] {
  const DAY = 86400000;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const monTime = monday.getTime();

  const indices = sessions
    .map((s) => {
      const d = new Date(s.startedAt);
      d.setHours(0, 0, 0, 0);
      return Math.floor((d.getTime() - monTime) / DAY);
    })
    .filter((i) => i >= 0 && i <= 6);

  return [...new Set(indices)];
}

export default function PlanningScreen() {
  const router = useRouter();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const activeTemplate = useWorkoutStore((s) => s.template);
  const sessions = useHistoryStore((s) => s.sessions);
  const unit = useUnitStore((s) => s.unit);
  const weeklyGoal = useUnitStore((s) => s.weeklyGoal);
  const { schedule, setDayTemplate } = useScheduleStore();
  const [preview, setPreview] = useState<WorkoutTemplate | null>(null);
  const [scheduleDayPicker, setScheduleDayPicker] = useState<number | null>(null);

  const streak = computeStreak(sessions);
  const muscleRecovery = getMuscleRecovery(sessions);
  const doneDays = getWeekDoneDays(sessions);
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sessionsThisWeek = sessions.filter((s) => new Date(s.startedAt) >= monday).length;
  const today = todayIndex();
  const doneTemplatesThisWeek = getDoneTemplatesThisWeek(sessions);

  // Today's template: from schedule if set, else rotation. null = rest day.
  const todayTemplate = (() => {
    if (today in schedule) {
      const scheduledId = schedule[today];
      if (scheduledId === null) return null; // explicit rest day
      const scheduled = TEMPLATES.find((t) => t.id === scheduledId);
      if (scheduled) return scheduled;
    }
    if (sessions.length === 0) return TEMPLATES[0];
    const lastId = sessions[0].templateId;
    const lastIdx = TEMPLATES.findIndex((t) => t.id === lastId);
    return TEMPLATES[(lastIdx + 1) % TEMPLATES.length];
  })();

  const handleStart = (template: typeof TEMPLATES[0]) => {
    startWorkout(template);
    router.push(`/workout/${template.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Topbar
          showBrand
          right={
            <Text style={styles.weekMeta}>{formatWeekLabel()}</Text>
          }
        />

        <Text style={styles.dateLabel}>{formatDate()}</Text>
        <Text style={styles.headline}>
          Time to{'\n'}<Text style={styles.headlineAccent}>lift.</Text>
        </Text>

        {/* Resume banner — shown when a workout is already in progress */}
        {activeTemplate && (
          <TouchableOpacity
            style={styles.resumeBanner}
            onPress={() => router.push(`/workout/${activeTemplate.id}` as '/workout/[id]')}
            activeOpacity={0.8}
          >
            <View>
              <Text style={styles.resumeEyebrow}>● In Progress</Text>
              <Text style={styles.resumeName}>{activeTemplate.name.toUpperCase()}</Text>
            </View>
            <Text style={styles.resumeArrow}>Resume →</Text>
          </TouchableOpacity>
        )}

        {/* Streak block */}
        <View style={styles.streakBlock}>
          <View>
            <Text style={styles.streakNum}>
              <Text style={styles.streakNumAccent}>{streak}</Text> DAYS
            </Text>
            <Text style={styles.streakLabel}>Streak</Text>
            <Text style={styles.streakGoal}>
              <Text style={[styles.streakGoalDone, sessionsThisWeek >= weeklyGoal && styles.streakGoalMet]}>
                {sessionsThisWeek}
              </Text>
              /{weeklyGoal} goal
            </Text>
          </View>
          <View style={styles.weekMarks}>
            {WEEK_DAYS.map((day, i) => {
              const scheduledId = schedule[i];
              const scheduledT = TEMPLATES.find((t) => t.id === scheduledId);
              const abbr = scheduledT ? scheduledT.name.split(' ')[0].slice(0, 3).toUpperCase() : null;
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.dayWrap}
                  onPress={() => setScheduleDayPicker(i)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayLetter,
                      doneDays.includes(i) && styles.dayDone,
                      i === today && styles.dayToday,
                      scheduledId && !doneDays.includes(i) && styles.dayScheduled,
                    ]}
                  >
                    {day}
                  </Text>
                  <View
                    style={[
                      styles.dayLine,
                      doneDays.includes(i) && styles.dayLineDone,
                      i === today && styles.dayLineToday,
                      scheduledId && !doneDays.includes(i) && styles.dayLineScheduled,
                    ]}
                  />
                  {abbr && (
                    <Text style={styles.dayAbbr}>{abbr}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Muscle recovery strip */}
        {sessions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recoveryStrip}
          >
            {MUSCLE_GROUPS.map((g) => {
              const h = muscleRecovery[g] ?? null;
              const threshold = RECOVERY_H[g] ?? 48;
              const pct = h === null ? 1 : Math.min(h / threshold, 1);
              const isReady = pct >= 1;
              const isFresh = h !== null && h < 12;
              const timeLabel = h === null ? '—'
                : h < 24 ? `${h}h`
                : `${Math.floor(h / 24)}d`;
              return (
                <View
                  key={g}
                  style={[
                    styles.recoveryChip,
                    isFresh && styles.recoveryChipFresh,
                    isReady && styles.recoveryChipReady,
                  ]}
                >
                  <Text style={[
                    styles.recoveryChipGroup,
                    isFresh && styles.recoveryChipGroupFresh,
                    isReady && styles.recoveryChipGroupReady,
                  ]}>
                    {GROUP_LABELS[g]}
                  </Text>
                  <View style={styles.recoveryBar}>
                    <View style={[styles.recoveryBarFill, { flex: pct }, isFresh && styles.recoveryBarFresh, isReady && styles.recoveryBarReady]} />
                    {pct < 1 && <View style={{ flex: 1 - pct }} />}
                  </View>
                  <Text style={[
                    styles.recoveryChipTime,
                    isFresh && styles.recoveryChipTimeFresh,
                    isReady && styles.recoveryChipTimeReady,
                  ]}>
                    {isReady ? 'Ready' : timeLabel}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Today's poster — rest day variant */}
        {todayTemplate === null && (
          <View style={styles.restDayPoster}>
            <Text style={styles.restDayEyebrow}>● Scheduled</Text>
            <Text style={styles.restDayTitle}>Rest{'\n'}<Text style={styles.restDayAccent}>Day.</Text></Text>
            <Text style={styles.restDayMeta}>Recovery is part of the program.</Text>
            <TouchableOpacity
              style={styles.restDayBtn}
              onPress={() => setScheduleDayPicker(today)}
              activeOpacity={0.7}
            >
              <Text style={styles.restDayBtnLabel}>Change →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's poster — workout variant */}
        {todayTemplate !== null && (() => {
          const lastSession = sessions.find((s) => s.templateId === todayTemplate.id);
          const lastDuration = lastSession?.endedAt && lastSession?.startedAt
            ? Math.floor((new Date(lastSession.endedAt).getTime() - new Date(lastSession.startedAt).getTime()) / 60000)
            : null;
          const lastVolKg = lastSession
            ? lastSession.exercises.reduce((sum, e) => sum + e.sets.reduce((s2, s) => s2 + s.weightKg * s.reps, 0), 0)
            : null;
          const lastVol = lastVolKg != null
            ? Math.round(unit === 'lb' ? lastVolKg * KG_TO_LB : lastVolKg).toLocaleString()
            : null;
          return (
            <TouchableOpacity style={styles.poster} onPress={() => handleStart(todayTemplate)} activeOpacity={0.85}>
              <Text style={styles.posterEyebrow}>▶ Today's Session</Text>
              <Text style={styles.posterTitle}>
                {todayTemplate.name.split(' ').slice(0, -1).join(' ')}
                {todayTemplate.name.split(' ').length > 1 ? '\n' : ''}
                <Text style={styles.posterTitleAccent}>
                  {todayTemplate.name.split(' ').slice(-1)[0].toUpperCase()}
                </Text>
              </Text>
              <Text style={styles.posterMeta}>
                <Text style={styles.posterMetaBold}>
                  {String(todayTemplate.exercises.length).padStart(2, '0')}
                </Text> Exercises ·{' '}
                <Text style={styles.posterMetaBold}>{todayTemplate.estimatedMinutes}</Text> Min ·{' '}
                <Text style={styles.posterMetaBold}>
                  {todayTemplate.exercises.reduce((s, e) => s + e.targetSets, 0)}
                </Text> Sets
              </Text>
              {lastSession && lastDuration != null && lastVol && (
                <View style={styles.posterLastRow}>
                  <Text style={styles.posterLastLabel}>Last time</Text>
                  <Text style={styles.posterLastVal}>
                    {lastDuration}min · {lastVol} {unit.toUpperCase()}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => handleStart(todayTemplate)}
                activeOpacity={0.8}
              >
                <Text style={styles.startBtnLabel}>▶ Start</Text>
              </TouchableOpacity>
              <Text style={styles.watermark}>
                {String(TEMPLATES.indexOf(todayTemplate) + 1).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          );
        })()}


        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')} activeOpacity={0.7}>
            <Text style={styles.sectionAll}>View All →</Text>
          </TouchableOpacity>
        </View>

        {/* Workout list */}
        {TEMPLATES.map((t, i) => {
          const isToday = todayTemplate !== null && t.id === todayTemplate.id;
          const isDone = doneTemplatesThisWeek.has(t.id);
          const doneSession = isDone
            ? sessions.find((s) => s.templateId === t.id && new Date(s.startedAt) >= monday)
            : null;
          const doneSets = doneSession?.exercises.reduce((sum, e) => sum + e.sets.length, 0) ?? 0;
          const doneVolKg = doneSession?.exercises.reduce(
            (sum, e) => sum + e.sets.reduce((s2, s) => s2 + s.weightKg * s.reps, 0), 0,
          ) ?? 0;
          const doneVolDisplay = doneVolKg > 0
            ? Math.round(unit === 'lb' ? doneVolKg * KG_TO_LB : doneVolKg).toLocaleString()
            : null;
          const doneDur = doneSession?.endedAt && doneSession?.startedAt
            ? Math.floor((new Date(doneSession.endedAt).getTime() - new Date(doneSession.startedAt).getTime()) / 60000)
            : null;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.wrow, isToday && styles.wrowToday, isDone && styles.wrowDone]}
              onPress={() => setPreview(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.wnum, isToday && styles.wnumToday, isDone && styles.wnumDone]}>
                {isDone ? '✓' : String(i + 1).padStart(2, '0')}
              </Text>
              <View style={styles.wmid}>
                <Text style={[styles.wname, isDone && styles.wnameDone]}>
                  {t.name.toUpperCase()}
                </Text>
                <Text style={styles.wsub}>
                  {isDone && doneSets > 0 ? (
                    <>
                      <Text style={styles.wsubBold}>{doneSets}</Text> sets ·{' '}
                      {doneVolDisplay && <><Text style={styles.wsubBold}>{doneVolDisplay}</Text> {unit.toUpperCase()}</>}
                    </>
                  ) : (
                    <>
                      <Text style={styles.wsubBold}>{t.exercises.length}</Text> EXC ·{' '}
                      {isToday ? 'Today' : `Day ${i + 1}`}
                    </>
                  )}
                </Text>
              </View>
              <View>
                <Text style={[styles.wdur, isDone && styles.wdurDone]}>
                  {isDone && doneDur != null ? doneDur : t.estimatedMinutes}
                </Text>
                <Text style={styles.wdurUnit}>Min</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Build your own */}
        <TouchableOpacity style={styles.customRow} activeOpacity={0.7} onPress={() => router.push('/builder' as '/builder')}>
          <Text style={[styles.wnum, { color: colors.accent, fontSize: 28 }]}>+</Text>
          <View style={styles.wmid}>
            <Text style={styles.wname}>Build Your Own</Text>
            <Text style={styles.wsub}>Pick exercises, sets and tempo yourself</Text>
          </View>
          <Text style={styles.customArrow}>GO →</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Schedule day picker */}
      <Modal
        visible={scheduleDayPicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setScheduleDayPicker(null)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setScheduleDayPicker(null)} />
        {scheduleDayPicker !== null && (
          <View style={styles.scheduleSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.scheduleSheetTitle}>
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][scheduleDayPicker]}
            </Text>
            <ScrollView contentContainerStyle={styles.scheduleOptions} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.scheduleOption, !schedule[scheduleDayPicker] && styles.scheduleOptionActive]}
                onPress={() => { setDayTemplate(scheduleDayPicker, null); setScheduleDayPicker(null); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.scheduleOptionLabel, !schedule[scheduleDayPicker] && styles.scheduleOptionLabelActive]}>
                  Rest Day
                </Text>
              </TouchableOpacity>
              {TEMPLATES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.scheduleOption, schedule[scheduleDayPicker] === t.id && styles.scheduleOptionActive]}
                  onPress={() => { setDayTemplate(scheduleDayPicker, t.id); setScheduleDayPicker(null); }}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={[styles.scheduleOptionLabel, schedule[scheduleDayPicker] === t.id && styles.scheduleOptionLabelActive]}>
                      {t.name.toUpperCase()}
                    </Text>
                    <Text style={styles.scheduleOptionMeta}>{t.exercises.length} exercises · {t.estimatedMinutes} min</Text>
                  </View>
                  {schedule[scheduleDayPicker] === t.id && (
                    <Text style={styles.scheduleOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Template preview modal */}
      <Modal visible={!!preview} animationType="slide" transparent onRequestClose={() => setPreview(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPreview(null)} />
        {preview && (
          <SafeAreaView style={styles.modalSheet} edges={['bottom']}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalEyebrow}>Preview</Text>
              <Text style={styles.modalTitle}>
                {preview.name.split(' ').slice(0, -1).join(' ')}{' '}
                <Text style={styles.modalTitleAccent}>
                  {preview.name.split(' ').slice(-1)[0]}
                </Text>
              </Text>
              <Text style={styles.modalMeta}>
                {preview.exercises.length} exercises · {preview.estimatedMinutes} min
              </Text>
              <View style={styles.modalDivider} />
              {preview.exercises.map((te) => {
                const ex = exerciseById(te.exerciseId);
                const lastSet = sessions
                  .flatMap((s) => s.exercises.filter((e) => e.exerciseId === te.exerciseId).flatMap((e) => e.sets))
                  .reduce((best: null | { weightKg: number; reps: number }, s) =>
                    !best || s.weightKg > best.weightKg ? s : best, null);
                const displayW = lastSet
                  ? (unit === 'lb' ? fmtKg(lastSet.weightKg * KG_TO_LB) : fmtKg(lastSet.weightKg))
                  : null;
                return (
                  <View key={te.exerciseId} style={styles.modalExRow}>
                    <View style={styles.modalLetterBox}>
                      <Text style={styles.modalLetter}>{ex?.startLetter ?? '?'}</Text>
                    </View>
                    <View style={styles.modalExMid}>
                      <Text style={styles.modalExName}>{(ex?.name ?? te.exerciseId).toUpperCase()}</Text>
                      <Text style={styles.modalExSub}>
                        {te.targetSets}×{te.targetReps}
                        {te.startWeightKg > 0 ? ` · ${unit === 'lb' ? fmtKg(te.startWeightKg * KG_TO_LB) : fmtKg(te.startWeightKg)} ${unit.toUpperCase()}` : ''}
                      </Text>
                    </View>
                    {displayW && (
                      <Text style={styles.modalLastWeight}>
                        {displayW}<Text style={styles.modalLastUnit}> {unit.toUpperCase()}</Text>
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalStart} onPress={() => { setPreview(null); handleStart(preview); }} activeOpacity={0.8}>
                <Text style={styles.modalStartLabel}>▶ Start</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 100 },

  weekMeta: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: tracking.wide, textTransform: 'uppercase', color: colors.ink },

  dateLabel: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: tracking.wide, textTransform: 'uppercase', color: colors.ink2, marginTop: 4 },
  headline: { fontFamily: fonts.display, fontSize: 64, lineHeight: 56, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink, marginTop: 10 },
  headlineAccent: { fontStyle: 'italic', color: colors.accent },

  streakBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.lineSoft, marginTop: 18 },
  streakNum: { fontFamily: fonts.display, fontSize: 34, letterSpacing: 1, lineHeight: 36, color: colors.ink },
  streakNumAccent: { color: colors.accent },
  streakLabel: { fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: tracking.wide, textTransform: 'uppercase', color: colors.ink2, marginTop: 2 },
  streakGoal: { fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: tracking.wide, color: colors.muted, marginTop: 3 },
  streakGoalDone: { fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.5, color: colors.accent },
  streakGoalMet: { color: colors.good },
  weekMarks: { flexDirection: 'row', gap: 6 },
  dayWrap: { width: 24, alignItems: 'center', paddingVertical: 4 },
  dayLetter: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, color: colors.muted },
  dayDone: { color: colors.ink },
  dayToday: { color: colors.accent },
  dayLine: { height: 2, width: '100%', backgroundColor: 'transparent', marginTop: 2 },
  dayLineDone: { backgroundColor: colors.ink },
  dayLineToday: { backgroundColor: colors.accent },
  dayScheduled: { color: colors.ink2 },
  dayLineScheduled: { backgroundColor: colors.lineSoft },
  dayAbbr: {
    fontFamily: fonts.sansMedium,
    fontSize: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 2,
    textAlign: 'center',
  },

  scheduleSheet: {
    backgroundColor: colors.bg,
    borderTopWidth: border.heavy,
    borderTopColor: colors.ink,
    maxHeight: '65%',
  },
  scheduleSheetTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  scheduleOptions: {
    paddingHorizontal: 20,
    gap: 1,
  },
  scheduleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    marginBottom: 4,
  },
  scheduleOptionActive: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  scheduleOptionLabel: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  scheduleOptionLabelActive: {
    color: colors.bg,
  },
  scheduleOptionMeta: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 2,
  },
  scheduleOptionCheck: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.bg,
  },

  restDayPoster: {
    marginTop: 18,
    borderWidth: border.heavy,
    borderColor: colors.ink,
    padding: 18,
  },
  restDayEyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  restDayTitle: {
    fontFamily: fonts.display,
    fontSize: 54,
    letterSpacing: 1,
    lineHeight: 48,
    color: colors.ink,
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 8,
  },
  restDayAccent: { fontStyle: 'italic', color: colors.accent },
  restDayMeta: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: tracking.wide,
    color: colors.muted,
    marginBottom: 14,
  },
  restDayBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  restDayBtnLabel: {
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: tracking.wide,
    color: colors.ink2,
  },

  poster: { marginTop: 18, backgroundColor: colors.ink, padding: 18, position: 'relative', overflow: 'hidden' },
  posterEyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: tracking.widest, textTransform: 'uppercase', color: colors.accent },
  posterTitle: { fontFamily: fonts.display, fontSize: 38, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 36, color: colors.bg, marginVertical: 8 },
  posterTitleAccent: { fontStyle: 'italic', color: colors.accent },
  posterMeta: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.muted, marginBottom: 14 },
  posterMetaBold: { color: colors.bg, fontFamily: fonts.sansBold },
  startBtn: { backgroundColor: colors.accent, paddingVertical: 14, paddingHorizontal: 22, alignSelf: 'flex-start' },
  startBtnLabel: { fontFamily: fonts.display, fontSize: 16, letterSpacing: tracking.widest, textTransform: 'uppercase', color: colors.bg },
  watermark: { position: 'absolute', right: -12, bottom: -30, fontFamily: fonts.display, fontSize: 160, color: 'rgba(245,240,225,0.06)', lineHeight: 160 },

  posterLastRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 14,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245,240,225,0.15)',
  },
  posterLastLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: 'rgba(245,240,225,0.45)',
  },
  posterLastVal: {
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 0.5,
    color: 'rgba(245,240,225,0.75)',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18, marginBottom: 6 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 16, letterSpacing: tracking.wide, textTransform: 'uppercase', color: colors.ink },
  sectionAll: { fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: tracking.wide, textTransform: 'uppercase', color: colors.ink2 },

  wrow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  wrowToday: {},
  wrowDone: { opacity: 0.5 },
  wnum: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: colors.muted, width: 30 },
  wnumToday: { color: colors.accent },
  wnumDone: { color: colors.good, fontSize: 18 },
  wmid: { flex: 1 },
  wname: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.ink, lineHeight: 20 },
  wnameDone: { textDecorationLine: 'line-through' },
  wsub: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginTop: 4 },
  wsubBold: { color: colors.ink2, fontFamily: fonts.sansSemiBold },
  wdur: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: colors.ink, textAlign: 'right' },
  wdurDone: { color: colors.muted },
  wdurUnit: { fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.muted, textAlign: 'right', marginTop: 2 },

  customRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 8, borderWidth: 2, borderColor: colors.lineSoft, borderStyle: 'dashed' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopWidth: border.heavy,
    borderTopColor: colors.ink,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 36,
    height: 3,
    backgroundColor: colors.lineSoft,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  modalContent: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 16 },
  modalEyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.accent,
    marginTop: 4,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
    lineHeight: 30,
    marginTop: 4,
  },
  modalTitleAccent: { fontStyle: 'italic', color: colors.accent },
  modalMeta: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 6,
  },
  modalDivider: {
    height: border.heavy,
    backgroundColor: colors.ink,
    marginVertical: 12,
  },
  modalExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  modalLetterBox: {
    width: 30,
    height: 30,
    borderWidth: border.heavy,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLetter: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  modalExMid: { flex: 1 },
  modalExName: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1,
    color: colors.ink,
    lineHeight: 16,
  },
  modalExSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 2,
  },
  modalLastWeight: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 0.5,
    color: colors.good,
  },
  modalLastUnit: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    color: colors.muted,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: border.heavy,
    borderTopColor: colors.ink,
  },
  modalStart: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalStartLabel: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: tracking.max,
    textTransform: 'uppercase',
    color: colors.bg,
  },
  customArrow: { fontFamily: fonts.display, fontSize: 14, letterSpacing: tracking.wide, color: colors.ink },

  recoveryStrip: {
    paddingVertical: 10,
    paddingHorizontal: 0,
    gap: 6,
    marginTop: 12,
  },
  recoveryChip: {
    width: 76,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    padding: 8,
    gap: 5,
  },
  recoveryChipFresh: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(200,65,42,0.06)',
  },
  recoveryChipReady: {
    borderColor: colors.good,
  },
  recoveryChipGroup: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  recoveryChipGroupFresh: { color: colors.accent },
  recoveryChipGroupReady: { color: colors.good },
  recoveryBar: {
    height: 3,
    flexDirection: 'row',
    backgroundColor: colors.lineSoft,
  },
  recoveryBarFill: {
    height: 3,
    backgroundColor: colors.ink2,
  },
  recoveryBarFresh: { backgroundColor: colors.accent },
  recoveryBarReady: { backgroundColor: colors.good },
  recoveryChipTime: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.ink2,
  },
  recoveryChipTimeFresh: { color: colors.accent },
  recoveryChipTimeReady: { color: colors.good },

  resumeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.ink,
    padding: 14,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  resumeEyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 2,
  },
  resumeName: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.bg,
  },
  resumeArrow: {
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: tracking.wide,
    color: colors.accent,
  },
});
