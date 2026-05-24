import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHistoryStore } from '@/store/historyStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { TEMPLATES } from '@/data/templates';
import { colors, fonts, border, tracking } from '@/theme/tokens';
import { Topbar } from '@/components/ui/Topbar';
import { buildComparisons } from '@/utils/comparison';
import type { WorkoutSession } from '@/types';

function formatDuration(session: WorkoutSession): string {
  if (!session.endedAt || !session.startedAt) return '—';
  const secs = Math.floor(
    (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000,
  );
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatSessionDate(iso: string): { day: string; date: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
    date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase(),
  };
}

function totalSets(session: WorkoutSession): number {
  return session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
}

function totalVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s2, s) => s2 + s.weightKg * s.reps, 0), 0,
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const sessions = useHistoryStore((s) => s.sessions);
  const previousSession = useHistoryStore((s) => s.previousSession);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const [filterTemplateId, setFilterTemplateId] = useState<string | null>(null);

  const visibleSessions = filterTemplateId
    ? filterTemplateId === 'custom'
      ? sessions.filter((s) => s.templateId.startsWith('custom-'))
      : sessions.filter((s) => s.templateId === filterTemplateId)
    : sessions;

  const usedTemplateIds = new Set(sessions.map((s) => s.templateId));
  const hasCustomSessions = sessions.some((s) => s.templateId.startsWith('custom-'));

  const handleRepeat = (session: WorkoutSession) => {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Topbar showBrand />

        <Text style={styles.headline}>
          Workout{'\n'}<Text style={styles.headlineAccent}>Log.</Text>
        </Text>

        {/* Template filter pills */}
        {sessions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pills}
          >
            <TouchableOpacity
              style={[styles.pill, filterTemplateId === null && styles.pillActive]}
              onPress={() => setFilterTemplateId(null)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillLabel, filterTemplateId === null && styles.pillLabelActive]}>
                All
              </Text>
            </TouchableOpacity>
            {TEMPLATES.filter((t) => usedTemplateIds.has(t.id)).map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.pill, filterTemplateId === t.id && styles.pillActive]}
                onPress={() => setFilterTemplateId(filterTemplateId === t.id ? null : t.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillLabel, filterTemplateId === t.id && styles.pillLabelActive]}>
                  {t.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
            {hasCustomSessions && (
              <TouchableOpacity
                style={[styles.pill, filterTemplateId === 'custom' && styles.pillActive]}
                onPress={() => setFilterTemplateId(filterTemplateId === 'custom' ? null : 'custom')}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillLabel, filterTemplateId === 'custom' && styles.pillLabelActive]}>
                  Custom
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {visibleSessions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyNum}>00</Text>
            <Text style={styles.emptyLabel}>
              {filterTemplateId ? 'No sessions for this workout.' : 'No sessions yet.\nStart lifting.'}
            </Text>
          </View>
        ) : (
          <>
            {/* Stats strip */}
            <View style={styles.statsStrip}>
              <View style={styles.statCell}>
                <Text style={styles.statNum}>{visibleSessions.length}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statNum}>
                  {visibleSessions.reduce((sum, s) => {
                    if (!s.endedAt || !s.startedAt) return sum;
                    return sum + Math.floor(
                      (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000,
                    );
                  }, 0)}
                </Text>
                <Text style={styles.statLabel}>Min Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statNum}>
                  {visibleSessions.reduce((sum, s) => sum + totalSets(s), 0)}
                </Text>
                <Text style={styles.statLabel}>Sets Done</Text>
              </View>
            </View>

            {/* Volume sparkline */}
            {visibleSessions.length > 1 && (() => {
              const recent = [...visibleSessions].reverse().slice(-12);
              const vols = recent.map(totalVolume);
              const maxVol = Math.max(...vols);
              const BAR_H = 36;
              return (
                <View style={styles.sparkWrap}>
                  <Text style={styles.sparkLabel}>Volume</Text>
                  <View style={styles.sparkBars}>
                    {recent.map((s, i) => (
                      <View key={s.id} style={styles.sparkBarWrap}>
                        <View
                          style={[
                            styles.sparkBar,
                            { height: maxVol > 0 ? Math.max(3, Math.round((vols[i] / maxVol) * BAR_H)) : 3 },
                          ]}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}

            {/* Session list — grouped by month */}
            {(() => {
              let lastMonth = '';
              return visibleSessions.map((session, i) => {
                const template = TEMPLATES.find((t) => t.id === session.templateId);
                const { day, date } = formatSessionDate(session.startedAt);
                const monthKey = new Date(session.startedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                const showMonthHeader = monthKey !== lastMonth;
                if (showMonthHeader) lastMonth = monthKey;
                const prev = previousSession(session.templateId, session.id);
                const hasPR = buildComparisons(session, prev).some((c) => c.delta === 'pr');
                return (
                  <React.Fragment key={session.id}>
                    {showMonthHeader && (
                      <View style={styles.monthHeader}>
                        <Text style={styles.monthLabel}>{monthKey}</Text>
                      </View>
                    )}
                <TouchableOpacity style={styles.row} onPress={() => router.push(`/history/${session.id}` as '/history/[id]')} activeOpacity={0.7}>
                  {/* Date column */}
                  <View style={styles.dateCol}>
                    <Text style={styles.dateDay}>{day}</Text>
                    <Text style={styles.dateDate}>{date}</Text>
                    {hasPR && <View style={styles.prDot} />}
                  </View>

                  {/* Info */}
                  <View style={styles.info}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {(session.templateName ?? template?.name ?? session.templateId).toUpperCase()}
                      </Text>
                      {hasPR && (
                        <View style={styles.prBadge}>
                          <Text style={styles.prBadgeText}>PR</Text>
                        </View>
                      )}
                      {session.note ? (
                        <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={colors.ink2} strokeWidth={2} strokeLinecap="round">
                          <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </Svg>
                      ) : null}
                    </View>
                    <Text style={styles.meta}>
                      <Text style={styles.metaBold}>{session.exercises.length}</Text> EXC ·{' '}
                      <Text style={styles.metaBold}>{totalSets(session)}</Text> SETS ·{' '}
                      <Text style={styles.metaBold}>{formatDuration(session)}</Text>
                    </Text>
                  </View>

                  {/* Repeat button */}
                  <TouchableOpacity
                    style={styles.repeatBtn}
                    onPress={() => handleRepeat(session)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.repeatLabel}>▶</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
                  </React.Fragment>
                );
              });
            })()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 100 },

  headline: {
    fontFamily: fonts.display,
    fontSize: 64,
    lineHeight: 56,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
    marginTop: 10,
    marginBottom: 18,
  },
  headlineAccent: { fontStyle: 'italic', color: colors.accent },

  empty: {
    marginTop: 32,
    borderTopWidth: border.heavy,
    borderTopColor: colors.ink,
    paddingTop: 14,
  },
  emptyNum: {
    fontFamily: fonts.display,
    fontSize: 96,
    letterSpacing: 2,
    color: colors.lineSoft,
    lineHeight: 80,
  },
  emptyLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 8,
    lineHeight: 20,
  },

  pills: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 12,
    paddingTop: 2,
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
    fontSize: 9,
    letterSpacing: tracking.wide,
    color: colors.ink,
  },
  pillLabelActive: { color: colors.bg },

  statsStrip: {
    flexDirection: 'row',
    borderTopWidth: border.heavy,
    borderBottomWidth: border.heavy,
    borderColor: colors.ink,
    marginBottom: 4,
  },
  statCell: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statDivider: {
    width: border.heavy,
    backgroundColor: colors.ink,
  },
  statNum: {
    fontFamily: fonts.display,
    fontSize: 32,
    letterSpacing: 1,
    color: colors.ink,
    lineHeight: 34,
  },
  statLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 2,
  },

  monthHeader: {
    paddingTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  monthLabel: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    gap: 12,
  },

  prDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 4,
  },
  prBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  prBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 7,
    letterSpacing: tracking.widest,
    color: colors.bg,
  },

  dateCol: {
    width: 44,
    alignItems: 'center',
  },
  dateDay: {
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: tracking.wide,
    color: colors.accent,
  },
  dateDate: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.ink,
    marginTop: 2,
    textAlign: 'center',
  },

  info: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.ink,
    lineHeight: 18,
  },
  meta: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 4,
  },
  metaBold: {
    fontFamily: fonts.sansSemiBold,
    color: colors.ink2,
  },

  sparkWrap: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    marginBottom: 2,
  },
  sparkLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 6,
  },
  sparkBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 36,
  },
  sparkBarWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    height: 36,
  },
  sparkBar: {
    backgroundColor: colors.accent,
    width: '100%',
  },

  repeatBtn: {
    width: 36,
    height: 36,
    borderWidth: border.heavy,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatLabel: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.accent,
  },
});
