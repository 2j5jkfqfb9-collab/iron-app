import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useHistoryStore } from '@/store/historyStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUnitStore } from '@/store/unitStore';
import { exerciseById } from '@/data/exercises';
import { TEMPLATES } from '@/data/templates';
import { colors, fonts, border, tracking } from '@/theme/tokens';
import { Topbar } from '@/components/ui/Topbar';
import { IconBtn } from '@/components/ui/IconBtn';
import { buildComparisons } from '@/utils/comparison';
import { fmtKg } from '@/utils/format';
import { ExerciseHistory } from '@/components/workout/ExerciseHistory';

const KG_TO_LB = 2.20462;

function formatDuration(startedAt: string, endedAt?: string): string {
  if (!endedAt) return '—';
  const secs = Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const sessions = useHistoryStore((s) => s.sessions);
  const session = sessions.find((s) => s.id === id);

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Topbar left={<IconBtn onPress={() => router.back()}><Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round"><Path d="M15 18l-6-6 6-6" /></Svg></IconBtn>} />
        <Text style={styles.notFound}>Session not found.</Text>
      </SafeAreaView>
    );
  }

  const deleteSession = useHistoryStore((s) => s.deleteSession);
  const previousSession = useHistoryStore((s) => s.previousSession);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const unit = useUnitStore((s) => s.unit);
  const [selectedExId, setSelectedExId] = useState<string | null>(null);

  const handleRepeat = () => {
    let template = TEMPLATES.find((t) => t.id === session.templateId);
    if (!template) {
      template = {
        id: session.templateId,
        name: session.templateName ?? 'Custom Workout',
        muscleGroup: 'upper',
        estimatedMinutes: session.exercises.length * 8,
        exercises: session.exercises.map((e) => {
          const best = e.sets.length > 0
            ? e.sets.reduce((max, s) => s.weightKg > max.weightKg ? s : max)
            : { weightKg: 40, reps: 10 };
          return {
            exerciseId: e.exerciseId,
            targetSets: e.sets.length,
            targetReps: best.reps,
            startWeightKg: best.weightKg,
          };
        }),
      };
    }
    startWorkout(template);
    router.push(`/workout/${template.id}` as '/workout/[id]');
  };
  const prevSession = previousSession(session.templateId, session.id);
  const comparisons = buildComparisons(session, prevSession);

  const template = TEMPLATES.find((t) => t.id === session.templateId);
  const templateName = session.templateName ?? template?.name ?? session.templateId;
  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const totalVolume = session.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s2, s) => s2 + s.weightKg * s.reps, 0), 0,
  );
  const avgRpe = (() => {
    const allSets = session.exercises.flatMap((e) => e.sets);
    return allSets.length > 0
      ? Math.round(allSets.reduce((s, set) => s + set.rpe, 0) / allSets.length)
      : 0;
  })();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Topbar
          left={
            <IconBtn onPress={() => router.back()}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </IconBtn>
          }
          center={<Text style={styles.topbarMeta}>Session</Text>}
          right={
            <IconBtn onPress={() =>
              Alert.alert(
                'Delete Session',
                'Permanently delete this workout? This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete', style: 'destructive',
                    onPress: () => { deleteSession(session.id); router.back(); },
                  },
                ],
              )
            }>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </Svg>
            </IconBtn>
          }
        />

        <Text style={styles.dateLabel}>{formatDate(session.startedAt)}</Text>
        <Text style={styles.headline}>
          {templateName.split(' ').slice(0, -1).join(' ')}{' '}
          <Text style={styles.headlineAccent}>
            {templateName.split(' ').slice(-1)[0]}
          </Text>
        </Text>

        {/* Stats strip */}
        <View style={styles.strip}>
          <View style={styles.stripCell}>
            <Text style={styles.stripNum}>{formatDuration(session.startedAt, session.endedAt)}</Text>
            <Text style={styles.stripLabel}>Duration</Text>
          </View>
          <View style={styles.stripDiv} />
          <View style={styles.stripCell}>
            <Text style={styles.stripNum}>{totalSets}</Text>
            <Text style={styles.stripLabel}>Sets</Text>
          </View>
          <View style={styles.stripDiv} />
          <View style={styles.stripCell}>
            <Text style={styles.stripNum}>
              {Math.round(unit === 'lb' ? totalVolume * KG_TO_LB : totalVolume)}
            </Text>
            <Text style={styles.stripLabel}>Vol {unit.toUpperCase()}</Text>
          </View>
          <View style={styles.stripDiv} />
          <View style={styles.stripCell}>
            <Text style={styles.stripNum}>{avgRpe}</Text>
            <Text style={styles.stripLabel}>Avg RPE</Text>
          </View>
        </View>

        {/* Note */}
        {session.note ? (
          <View style={styles.noteBlock}>
            <Text style={styles.noteLabel}>Note</Text>
            <Text style={styles.noteText}>{session.note}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.repeatBtn} onPress={handleRepeat} activeOpacity={0.8}>
          <Text style={styles.repeatBtnLabel}>▶ Repeat This Workout</Text>
        </TouchableOpacity>

        {/* Exercise breakdown */}
        {session.exercises.map((ex) => {
          const exercise = exerciseById(ex.exerciseId);
          const cmp = comparisons.find((c) => c.exerciseId === ex.exerciseId);
          const isPR = cmp?.delta === 'pr';
          return (
            <View key={ex.exerciseId} style={styles.exBlock}>
              <TouchableOpacity
                style={styles.exHeader}
                onPress={() => setSelectedExId(ex.exerciseId)}
                activeOpacity={0.7}
              >
                <View style={styles.letterBox}>
                  <Text style={styles.letter}>{exercise?.startLetter ?? '?'}</Text>
                </View>
                <Text style={styles.exName}>
                  {(exercise?.name ?? ex.exerciseId).toUpperCase()}
                </Text>
                {isPR && (
                  <View style={styles.prBadge}>
                    <Text style={styles.prBadgeText}>PR</Text>
                  </View>
                )}
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.ink2} strokeWidth={2} strokeLinecap="round">
                  <Path d="M9 18l6-6-6-6" />
                </Svg>
              </TouchableOpacity>

              {/* Exercise note */}
              {ex.note ? (
                <View style={styles.exNote}>
                  <Text style={styles.exNoteText}>{ex.note}</Text>
                </View>
              ) : null}

              {/* Set rows */}
              <View style={styles.setTable}>
                <View style={styles.setTableHead}>
                  <Text style={[styles.setCell, styles.setHeadText]}>Set</Text>
                  <Text style={[styles.setCell, styles.setHeadText, styles.setCellNum]}>Reps</Text>
                  <Text style={[styles.setCell, styles.setHeadText, styles.setCellNum]}>{unit.toUpperCase()}</Text>
                  <Text style={[styles.setCell, styles.setHeadText, styles.setCellNum]}>RPE</Text>
                  <Text style={[styles.setCell, styles.setHeadText, styles.setCellNum]}>VOL</Text>
                </View>
                {ex.sets.map((s, i) => (
                  <View key={i} style={styles.setRow}>
                    <Text style={[styles.setCell, styles.setNum]}>{String(i + 1).padStart(2, '0')}</Text>
                    <Text style={[styles.setCell, styles.setVal, styles.setCellNum]}>{s.reps}</Text>
                    <Text style={[styles.setCell, styles.setVal, styles.setCellNum]}>
                      {fmtKg(unit === 'lb' ? s.weightKg * KG_TO_LB : s.weightKg)}
                    </Text>
                    <Text style={[styles.setCell, styles.setRpe, styles.setCellNum]}>{s.rpe}</Text>
                    <Text style={[styles.setCell, styles.setVol, styles.setCellNum]}>
                      {fmtKg(unit === 'lb' ? s.weightKg * s.reps * KG_TO_LB : s.weightKg * s.reps)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Exercise drill-down modal */}
      <Modal
        visible={selectedExId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedExId(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedExId(null)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          {selectedExId && (() => {
            const exercise = exerciseById(selectedExId);
            const name = exercise?.name ?? selectedExId;
            const words = name.split(' ');
            const last = words[words.length - 1];
            const base = words.slice(0, -1).join(' ');
            return (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.letterBox}>
                    <Text style={styles.letter}>{exercise?.startLetter ?? '?'}</Text>
                  </View>
                  <Text style={styles.modalTitle}>
                    {base ? `${base.toUpperCase()} ` : ''}
                    <Text style={styles.modalTitleAccent}>{last.toUpperCase()}</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedExId(null)} activeOpacity={0.7} style={styles.modalClose}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink2} strokeWidth={2} strokeLinecap="round">
                      <Path d="M18 6L6 18M6 6l12 12" />
                    </Svg>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  contentContainerStyle={styles.modalScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <ExerciseHistory exerciseId={selectedExId} sessions={sessions} maxRows={12} />
                  <View style={{ height: 40 }} />
                </ScrollView>
              </>
            );
          })()}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 60 },

  topbarMeta: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.ink2,
  },

  notFound: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, padding: 22 },

  dateLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.ink2,
    marginTop: 4,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 38,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
    marginTop: 6,
    marginBottom: 16,
  },
  headlineAccent: { fontStyle: 'italic', color: colors.accent },

  strip: {
    flexDirection: 'row',
    borderTopWidth: border.heavy,
    borderBottomWidth: border.heavy,
    borderColor: colors.ink,
    marginBottom: 16,
  },
  stripCell: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  stripDiv: { width: border.heavy, backgroundColor: colors.ink },
  stripNum: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 1,
    color: colors.ink,
    lineHeight: 24,
  },
  stripLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 2,
  },

  repeatBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  repeatBtnLabel: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: tracking.max,
    textTransform: 'uppercase',
    color: colors.bg,
  },

  noteBlock: {
    borderWidth: border.heavy,
    borderColor: colors.ink,
    padding: 12,
    marginBottom: 16,
  },
  noteLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 8,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 4,
  },
  noteText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18,
  },

  prBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 8,
    letterSpacing: tracking.widest,
    color: colors.bg,
  },

  exBlock: { marginBottom: 16 },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  letterBox: {
    width: 32,
    height: 32,
    borderWidth: border.heavy,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.ink,
  },
  exName: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.ink,
    flex: 1,
  },

  exNote: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: 8,
    marginBottom: 6,
  },
  exNoteText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.ink2,
    lineHeight: 16,
    fontStyle: 'italic',
  },

  setTable: { borderWidth: border.heavy, borderColor: colors.ink },
  setTableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.surface2,
  },
  setHeadText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.ink2,
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  setCell: { flex: 1 },
  setCellNum: { textAlign: 'right' },
  setNum: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1,
    color: colors.muted,
  },
  setVal: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 0.5,
    color: colors.ink,
  },
  setRpe: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.accent,
  },
  setVol: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.ink2,
    lineHeight: 18,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopWidth: border.heavy,
    borderTopColor: colors.ink,
    maxHeight: '72%',
  },
  modalHandle: {
    width: 32,
    height: 3,
    backgroundColor: colors.ink2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: border.heavy,
    borderBottomColor: colors.ink,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 1,
    color: colors.ink,
    flex: 1,
  },
  modalTitleAccent: {
    fontStyle: 'italic',
    color: colors.accent,
  },
  modalClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
});
