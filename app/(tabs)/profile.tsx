import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Modal, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Rect, Line, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHistoryStore, clearHistory } from '@/store/historyStore';
import { buildComparisons } from '@/utils/comparison';
import { TEMPLATES } from '@/data/templates';
import { EXERCISES } from '@/data/exercises';
import { colors, fonts, border, tracking } from '@/theme/tokens';
import { fmtKg } from '@/utils/format';
import { Topbar } from '@/components/ui/Topbar';
import { useUnitStore } from '@/store/unitStore';
import { useWeightStore } from '@/store/weightStore';
import { ExerciseHistory } from '@/components/workout/ExerciseHistory';

function computeStreak(sessions: ReturnType<typeof useHistoryStore.getState>['sessions']): number {
  if (sessions.length === 0) return 0;
  const DAY = 86400000;
  const days = sessions
    .map((s) => {
      const d = new Date(s.startedAt);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    })
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => b - a);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (days[0] < today.getTime() - DAY) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i - 1] - days[i] === DAY) streak++;
    else break;
  }
  return streak;
}

const CHART_W = 260;
const CHART_H = 40;
const PAD = 6;

export default function ProfileScreen() {
  const sessions = useHistoryStore((s) => s.sessions);
  const { unit, toggle, weeklyGoal, setWeeklyGoal } = useUnitStore();
  const { entries: weightEntries, addEntry: addWeight, deleteEntry: deleteWeight } = useWeightStore();
  const [weightInput, setWeightInput] = useState('');
  const [drillExId, setDrillExId] = useState<string | null>(null);

  const totalSessions = sessions.length;
  const streak = computeStreak(sessions);
  const totalMinutes = sessions.reduce((sum, s) => {
    if (!s.endedAt || !s.startedAt) return sum;
    return sum + Math.floor(
      (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000,
    );
  }, 0);

  // Count all PRs across sessions
  let prCount = 0;
  for (let i = 0; i < sessions.length; i++) {
    const current = sessions[i];
    const previous = sessions.slice(i + 1).find((s) => s.templateId === current.templateId) ?? null;
    const comparisons = buildComparisons(current, previous);
    prCount += comparisons.filter((c) => c.delta === 'pr').length;
  }

  // Personal bests: highest + second-highest weight per exercise for trend arrow
  const personalBests = EXERCISES.map((ex) => {
    const allWeights = sessions
      .flatMap((s) => s.exercises.filter((e) => e.exerciseId === ex.id).flatMap((e) => e.sets))
      .map((s) => s.weightKg)
      .filter((w) => w > 0)
      .sort((a, b) => b - a);
    if (allWeights.length === 0) return null;
    const best = allWeights[0];
    const prev = allWeights.find((w) => w < best) ?? null;
    return { exercise: ex, weightKg: best, prevWeightKg: prev };
  }).filter((pb): pb is NonNullable<typeof pb> => pb !== null);

  const KG_TO_LB = 2.20462;

  // Epley estimated 1RM: round to nearest 2.5 kg
  const epley1RM = (weightKg: number, reps: number) =>
    Math.round((weightKg * (1 + reps / 30)) / 2.5) * 2.5;

  // Top lift: exercise with highest estimated 1RM, plus trend over last 10 sessions
  const topLiftData = (() => {
    if (sessions.length < 2) return null;
    let bestExId: string | null = null;
    let bestRM = 0;
    for (const ex of EXERCISES) {
      const allSets = sessions.flatMap((s) =>
        s.exercises.filter((e) => e.exerciseId === ex.id).flatMap((e) => e.sets),
      );
      if (allSets.length === 0) continue;
      const maxRM = Math.max(...allSets.map((s) => epley1RM(s.weightKg, s.reps)));
      if (maxRM > bestRM) { bestRM = maxRM; bestExId = ex.id; }
    }
    if (!bestExId) return null;
    const trend = sessions
      .filter((s) => s.exercises.some((e) => e.exerciseId === bestExId))
      .slice(0, 10)
      .reverse()
      .map((s) => {
        const exData = s.exercises.find((e) => e.exerciseId === bestExId);
        if (!exData || exData.sets.length === 0) return null;
        const best = exData.sets.reduce((max, set) =>
          epley1RM(set.weightKg, set.reps) > epley1RM(max.weightKg, max.reps) ? set : max,
        );
        return epley1RM(best.weightKg, best.reps);
      })
      .filter((v): v is number => v !== null);
    if (trend.length < 2) return null;
    return { exId: bestExId, trend, currentRM: trend[trend.length - 1] };
  })();

  const totalVolume = sessions.reduce((sum, s) =>
    sum + s.exercises.reduce((eSum, e) =>
      eSum + e.sets.reduce((sSum, set) => sSum + set.weightKg * set.reps, 0), 0), 0);
  const displayVolume = unit === 'kg'
    ? Math.round(totalVolume).toLocaleString()
    : Math.round(totalVolume * KG_TO_LB).toLocaleString();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Topbar showBrand />

        <Text style={styles.headline}>
          Your{'\n'}<Text style={styles.headlineAccent}>Stats.</Text>
        </Text>

        {/* Main stats grid */}
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <View style={[styles.cell, styles.cellAccent]}>
              <Text style={styles.cellNumLight}>{totalSessions}</Text>
              <Text style={styles.cellLabelLight}>Sessions</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.cellNum}>{streak}</Text>
              <Text style={styles.cellLabel}>Day Streak</Text>
            </View>
          </View>
          <View style={[styles.gridRow, styles.gridRowBorder]}>
            <View style={styles.cell}>
              <Text style={styles.cellNum}>{prCount}</Text>
              <Text style={styles.cellLabel}>PRs Hit</Text>
            </View>
            <View style={[styles.cell, styles.cellBorderLeft]}>
              <Text style={styles.cellNum}>{totalMinutes}</Text>
              <Text style={styles.cellLabel}>Min Trained</Text>
            </View>
          </View>
        </View>

        {/* Top lift 1RM trend */}
        {topLiftData && (() => {
          const exercise = EXERCISES.find((e) => e.id === topLiftData.exId);
          const trend = unit === 'lb'
            ? topLiftData.trend.map((v) => Math.round(v * KG_TO_LB / 2.5) * 2.5)
            : topLiftData.trend;
          const displayRM = trend[trend.length - 1];
          const delta = trend[trend.length - 1] - trend[0];
          const minV = Math.min(...trend);
          const maxV = Math.max(...trend);
          const range = maxV - minV || 1;
          const SPARK_W = 120;
          const SPARK_H = 36;
          const pts = trend.map((v, i) => {
            const x = (i / (trend.length - 1)) * SPARK_W;
            const y = SPARK_H - 4 - ((v - minV) / range) * (SPARK_H - 8);
            return `${x},${y}`;
          }).join(' ');
          const lineColor = delta >= 0 ? colors.good : colors.accent;
          return (
            <View style={styles.topLiftBlock}>
              <View style={styles.topLiftLeft}>
                <Text style={styles.topLiftEyebrow}>Top Lift · Est. 1RM</Text>
                <Text style={styles.topLiftName}>
                  {exercise?.name.split(' ').slice(0, -1).join(' ')}{exercise?.name.split(' ').length !== 1 ? ' ' : ''}
                  <Text style={styles.topLiftNameAccent}>
                    {exercise?.name.split(' ').slice(-1)[0].toUpperCase()}
                  </Text>
                </Text>
                <Text style={styles.topLiftRM}>
                  {fmtKg(displayRM)}
                  <Text style={styles.topLiftUnit}> {unit.toUpperCase()}</Text>
                  {delta !== 0 && (
                    <Text style={[styles.topLiftDelta, { color: lineColor }]}>
                      {delta > 0 ? `  ↑+${fmtKg(Math.abs(delta))}` : `  ↓${fmtKg(Math.abs(delta))}`}
                    </Text>
                  )}
                </Text>
              </View>
              <Svg width={SPARK_W} height={SPARK_H}>
                <Polyline
                  points={pts}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={2}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
                {trend.map((v, i) => {
                  const x = (i / (trend.length - 1)) * SPARK_W;
                  const y = SPARK_H - 4 - ((v - minV) / range) * (SPARK_H - 8);
                  return (
                    <Circle
                      key={i}
                      cx={x} cy={y}
                      r={i === trend.length - 1 ? 3.5 : 2}
                      fill={lineColor}
                    />
                  );
                })}
              </Svg>
            </View>
          );
        })()}

        {/* Volume block */}
        <View style={styles.volumeBlock}>
          <View style={styles.volumeLeft}>
            <Text style={styles.volumeLabel}>Total Volume</Text>
            <Text style={styles.volumeNum}>
              {displayVolume}
              <Text style={styles.volumeUnit}> {unit.toUpperCase()}</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.unitToggle} onPress={toggle} activeOpacity={0.7}>
            <Text style={[styles.unitOption, unit === 'kg' && styles.unitOptionActive]}>KG</Text>
            <View style={styles.unitDivider} />
            <Text style={[styles.unitOption, unit === 'lb' && styles.unitOptionActive]}>LB</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly goal picker */}
        {(() => {
          const monday = new Date();
          monday.setHours(0, 0, 0, 0);
          monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
          const sessionsThisWeek = sessions.filter((s) => new Date(s.startedAt) >= monday).length;
          const GOAL_OPTIONS = [2, 3, 4, 5];
          return (
            <View style={styles.goalBlock}>
              <View style={styles.goalLeft}>
                <Text style={styles.goalLabel}>Weekly Goal</Text>
                <Text style={styles.goalProgress}>
                  <Text style={[styles.goalDone, sessionsThisWeek >= weeklyGoal && { color: colors.good }]}>
                    {sessionsThisWeek}
                  </Text>
                  <Text style={styles.goalSlash}>/{weeklyGoal}</Text>
                  <Text style={styles.goalUnit}> this week</Text>
                </Text>
              </View>
              <View style={styles.goalPicker}>
                {GOAL_OPTIONS.map((n, idx) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.goalOption, idx > 0 && styles.goalOptionBorder, weeklyGoal === n && styles.goalOptionActive]}
                    onPress={() => setWeeklyGoal(n)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.goalOptionLabel, weeklyGoal === n && styles.goalOptionLabelActive]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Weekly volume bar chart */}
        {(() => {
          const WEEKS = 8;
          const BCW = 300;
          const BCH = 52;
          const BPAD = 0;
          const BAR_GAP = 3;
          const now = new Date();
          const monday = new Date(now);
          monday.setHours(0, 0, 0, 0);
          monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
          const buckets = Array.from({ length: WEEKS }, (_, i) => {
            const start = new Date(monday.getTime() - (WEEKS - 1 - i) * 7 * 86400000);
            const end = new Date(start.getTime() + 7 * 86400000);
            const volumeKg = sessions
              .filter((s) => { const d = new Date(s.startedAt); return d >= start && d < end; })
              .reduce((sum, s) =>
                sum + s.exercises.reduce((eSum, e) =>
                  eSum + e.sets.reduce((sSum, set) => sSum + set.weightKg * set.reps, 0), 0), 0);
            return { volumeKg, isCurrent: i === WEEKS - 1 };
          });
          const maxVol = Math.max(...buckets.map((b) => b.volumeKg), 1);
          const totalW = BCW - BPAD * 2;
          const barW = (totalW - (WEEKS - 1) * BAR_GAP) / WEEKS;
          const hasData = buckets.some((b) => b.volumeKg > 0);
          return (
            <View style={styles.weekSection}>
              <View style={styles.weekHeader}>
                <Text style={styles.sectionTitle}>Weekly Volume</Text>
                <Text style={styles.weekSubtitle}>Last 8 Weeks</Text>
              </View>
              {hasData ? (
                <Svg width="100%" height={BCH} viewBox={`0 0 ${BCW} ${BCH}`}>
                  <Line x1={0} y1={BCH - 1} x2={BCW} y2={BCH - 1} stroke={colors.lineSoft} strokeWidth={1} />
                  {buckets.map((b, i) => {
                    const x = BPAD + i * (barW + BAR_GAP);
                    const barH = b.volumeKg > 0 ? Math.max(3, (b.volumeKg / maxVol) * (BCH - 4)) : 0;
                    const y = BCH - 1 - barH;
                    return (
                      <Rect
                        key={i}
                        x={x}
                        y={y}
                        width={barW}
                        height={barH}
                        fill={b.isCurrent ? colors.accent : b.volumeKg > 0 ? colors.ink : colors.lineSoft}
                      />
                    );
                  })}
                </Svg>
              ) : (
                <Text style={styles.weightEmpty}>No data yet — finish a workout.</Text>
              )}
            </View>
          );
        })()}

        {/* Volume by muscle group */}
        {sessions.length > 0 && (() => {
          const GROUP_NAMES: Record<string, string> = {
            lower: 'Lower', push: 'Push', pull: 'Pull',
            upper: 'Upper', core: 'Core', mobility: 'Mobility',
          };
          const volByGroup: Record<string, number> = {};
          for (const session of sessions) {
            for (const ex of session.exercises) {
              const exercise = EXERCISES.find((e) => e.id === ex.exerciseId);
              if (!exercise) continue;
              const vol = ex.sets.reduce((s, set) => s + set.weightKg * set.reps, 0);
              volByGroup[exercise.muscleGroup] = (volByGroup[exercise.muscleGroup] ?? 0) + vol;
            }
          }
          const sorted = Object.entries(volByGroup).sort((a, b) => b[1] - a[1]);
          if (sorted.length === 0) return null;
          const maxVol = sorted[0][1];
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Volume by Group</Text>
              {sorted.map(([group, vol]) => {
                const displayVol = unit === 'lb'
                  ? Math.round(vol * KG_TO_LB).toLocaleString()
                  : Math.round(vol).toLocaleString();
                const barPct = vol / maxVol;
                return (
                  <View key={group} style={styles.groupRow}>
                    <Text style={styles.groupName}>{GROUP_NAMES[group] ?? group}</Text>
                    <View style={styles.groupBarTrack}>
                      <View style={[styles.groupBarFill, { flex: barPct }]} />
                      <View style={{ flex: 1 - barPct }} />
                    </View>
                    <Text style={styles.groupVol}>{displayVol}</Text>
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* Personal bests */}
        {personalBests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Records</Text>
            {personalBests.map(({ exercise, weightKg, prevWeightKg }) => {
              const displayW = unit === 'kg' ? weightKg : weightKg * KG_TO_LB;
              const displayPrev = prevWeightKg != null
                ? (unit === 'kg' ? prevWeightKg : prevWeightKg * KG_TO_LB)
                : null;
              const delta = displayPrev != null ? displayW - displayPrev : null;
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.trow}
                  onPress={() => setDrillExId(exercise.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.pbLeft}>
                    <View style={styles.pbLetterBox}>
                      <Text style={styles.pbLetter}>{exercise.startLetter}</Text>
                    </View>
                    <View>
                      <Text style={styles.tname}>{exercise.name.toUpperCase()}</Text>
                      {delta != null && (
                        <Text style={[styles.pbDelta, { color: delta > 0 ? colors.good : colors.muted }]}>
                          {delta > 0 ? `↑ +${fmtKg(delta)}` : delta < 0 ? `↓ ${fmtKg(delta)}` : '= same'} {unit.toUpperCase()}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.pbRight}>
                    <Text style={styles.pbWeight}>
                      {fmtKg(displayW)}
                      <Text style={styles.pbUnit}> {unit.toUpperCase()}</Text>
                    </Text>
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={colors.ink2} strokeWidth={2} strokeLinecap="round">
                      <Path d="M9 18l6-6-6-6" />
                    </Svg>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Body weight log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Weight</Text>
          {(() => {
            const recent = weightEntries.slice(0, 14);
            const last = recent[0];
            const displayLast = last
              ? fmtKg(unit === 'lb' ? last.weightKg * KG_TO_LB : last.weightKg)
              : null;

            const chartPts = [...recent].reverse()
              .map((e) => unit === 'lb' ? e.weightKg * KG_TO_LB : e.weightKg);
            const min = chartPts.length > 0 ? Math.min(...chartPts) : 0;
            const max = chartPts.length > 0 ? Math.max(...chartPts) : 1;
            const range = max - min || 1;
            const pts = chartPts.map((v, i) => {
              const x = PAD + (i / Math.max(chartPts.length - 1, 1)) * (CHART_W - PAD * 2);
              const y = CHART_H - PAD - ((v - min) / range) * (CHART_H - PAD * 2);
              return `${x},${y}`;
            });

            return (
              <>
                {chartPts.length >= 2 && (
                  <View style={styles.weightChart}>
                    <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
                      <Polyline
                        points={pts.join(' ')}
                        fill="none"
                        stroke={colors.accent}
                        strokeWidth={2}
                        strokeLinecap="square"
                        strokeLinejoin="miter"
                      />
                      {pts.map((p, i) => {
                        const [x, y] = p.split(',').map(Number);
                        return <Circle key={i} cx={x} cy={y} r={2.5} fill={colors.accent} />;
                      })}
                    </Svg>
                  </View>
                )}
                <View style={styles.weightRow}>
                  {displayLast ? (
                    <View style={styles.weightLast}>
                      <Text style={styles.weightLastNum}>{displayLast}</Text>
                      <Text style={styles.weightLastUnit}>{unit.toUpperCase()}</Text>
                    </View>
                  ) : (
                    <Text style={styles.weightEmpty}>No entries yet</Text>
                  )}
                  <View style={styles.weightInput}>
                    <TextInput
                      style={styles.weightInputField}
                      placeholder={unit === 'lb' ? '0.0 lb' : '0.0 kg'}
                      placeholderTextColor={colors.muted}
                      keyboardType="decimal-pad"
                      value={weightInput}
                      onChangeText={setWeightInput}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={styles.weightAddBtn}
                      onPress={() => {
                        const raw = parseFloat(weightInput.replace(',', '.'));
                        if (isNaN(raw) || raw <= 0) return;
                        const kg = unit === 'lb' ? raw / KG_TO_LB : raw;
                        addWeight(Math.round(kg * 10) / 10);
                        setWeightInput('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.weightAddBtnLabel}>Log</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {last && (
                  <TouchableOpacity
                    onPress={() => Alert.alert(
                      'Delete Entry',
                      'Remove the last weight entry?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteWeight(last.id) },
                      ],
                    )}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.weightDeleteHint}>
                      Last: {new Date(last.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · tap to delete
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            );
          })()}
        </View>

        {/* Templates trained */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trained</Text>
          {(() => {
            const knownRows = TEMPLATES.map((t) => ({
              id: t.id,
              name: t.name,
              count: sessions.filter((s) => s.templateId === t.id).length,
            })).filter((r) => r.count > 0);
            const customCount = sessions.filter((s) => s.templateId.startsWith('custom-')).length;
            return (
              <>
                {knownRows.map((r) => (
                  <View key={r.id} style={styles.trow}>
                    <Text style={styles.tname}>{r.name.toUpperCase()}</Text>
                    <Text style={styles.tcount}><Text style={styles.tcountNum}>{r.count}</Text>×</Text>
                  </View>
                ))}
                {customCount > 0 && (
                  <View style={styles.trow}>
                    <Text style={styles.tname}>CUSTOM</Text>
                    <Text style={styles.tcount}><Text style={styles.tcountNum}>{customCount}</Text>×</Text>
                  </View>
                )}
                {knownRows.length === 0 && customCount === 0 && (
                  <Text style={styles.tname}>—</Text>
                )}
              </>
            );
          })()}
        </View>

        {/* Reset — danger zone */}
        {sessions.length > 0 && (
          <View style={styles.dangerZone}>
            <Text style={styles.dangerLabel}>Data</Text>
            <TouchableOpacity
              style={styles.dangerBtn}
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert(
                  'Clear All History',
                  'This will permanently delete all workout sessions. This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: clearHistory },
                  ],
                )
              }
            >
              <Text style={styles.dangerBtnLabel}>Clear All History</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Exercise history drill-down modal */}
      <Modal
        visible={drillExId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDrillExId(null)}
      >
        <TouchableOpacity
          style={styles.drillBackdrop}
          activeOpacity={1}
          onPress={() => setDrillExId(null)}
        />
        <View style={styles.drillSheet}>
          <View style={styles.drillHandle} />
          {drillExId && (() => {
            const ex = EXERCISES.find((e) => e.id === drillExId);
            const name = ex?.name ?? drillExId;
            const words = name.split(' ');
            const last = words[words.length - 1];
            const base = words.slice(0, -1).join(' ');
            return (
              <>
                <View style={styles.drillHeader}>
                  <View style={styles.drillLetterBox}>
                    <Text style={styles.drillLetter}>{ex?.startLetter ?? '?'}</Text>
                  </View>
                  <Text style={styles.drillTitle}>
                    {base ? `${base.toUpperCase()} ` : ''}
                    <Text style={styles.drillTitleAccent}>{last.toUpperCase()}</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setDrillExId(null)} activeOpacity={0.7} style={styles.drillClose}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink2} strokeWidth={2} strokeLinecap="round">
                      <Path d="M18 6L6 18M6 6l12 12" />
                    </Svg>
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.drillScroll} showsVerticalScrollIndicator={false}>
                  <ExerciseHistory exerciseId={drillExId} sessions={sessions} maxRows={12} />
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

  grid: {
    borderWidth: border.heavy,
    borderColor: colors.ink,
    marginBottom: 10,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridRowBorder: {
    borderTopWidth: border.heavy,
    borderTopColor: colors.ink,
  },
  cell: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  cellAccent: {
    backgroundColor: colors.accent,
    borderRightWidth: border.heavy,
    borderRightColor: colors.ink,
  },
  cellBorderLeft: {
    borderLeftWidth: border.heavy,
    borderLeftColor: colors.ink,
  },
  cellNum: {
    fontFamily: fonts.display,
    fontSize: 42,
    letterSpacing: 1,
    color: colors.ink,
    lineHeight: 42,
  },
  cellNumLight: {
    fontFamily: fonts.display,
    fontSize: 42,
    letterSpacing: 1,
    color: colors.bg,
    lineHeight: 42,
  },
  cellLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 4,
  },
  cellLabelLight: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: 'rgba(245,240,225,0.7)',
    marginTop: 4,
  },

  volumeBlock: {
    borderWidth: border.heavy,
    borderColor: colors.ink,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  volumeLeft: { flex: 1 },
  volumeLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  volumeNum: {
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: 1,
    color: colors.ink,
    lineHeight: 36,
    marginTop: 2,
  },
  volumeUnit: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.ink2,
  },
  unitToggle: {
    flexDirection: 'row',
    borderWidth: border.heavy,
    borderColor: colors.ink,
  },
  unitOption: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: tracking.wide,
    color: colors.muted,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  unitOptionActive: {
    color: colors.bg,
    backgroundColor: colors.ink,
  },
  unitDivider: {
    width: border.heavy,
    backgroundColor: colors.ink,
  },

  goalBlock: {
    borderWidth: border.heavy,
    borderColor: colors.ink,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalLeft: { flex: 1 },
  goalLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  goalProgress: {
    marginTop: 2,
  },
  goalDone: {
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: 1,
    color: colors.accent,
    lineHeight: 34,
  },
  goalSlash: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 1,
    color: colors.ink2,
  },
  goalUnit: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1,
  },
  goalPicker: {
    flexDirection: 'row',
    borderWidth: border.heavy,
    borderColor: colors.ink,
  },
  goalOption: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalOptionBorder: {
    borderLeftWidth: border.heavy,
    borderLeftColor: colors.ink,
  },
  goalOptionActive: {
    backgroundColor: colors.ink,
  },
  goalOptionLabel: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.muted,
  },
  goalOptionLabelActive: {
    color: colors.bg,
  },

  weekSection: {
    marginTop: 8,
    borderTopWidth: border.heavy,
    borderTopColor: colors.ink,
    paddingTop: 10,
    marginBottom: 4,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  weekSubtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
  },

  section: {
    marginTop: 8,
    borderTopWidth: border.heavy,
    borderTopColor: colors.ink,
    paddingTop: 10,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.ink,
    marginBottom: 4,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  groupName: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.ink2,
    width: 52,
  },
  groupBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.lineSoft,
    flexDirection: 'row',
  },
  groupBarFill: {
    height: 6,
    backgroundColor: colors.accent,
  },
  groupVol: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.ink2,
    width: 60,
    textAlign: 'right',
  },
  trow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  tname: {
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.ink,
    flex: 1,
  },
  pbLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pbLetterBox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pbLetter: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.ink,
  },
  pbDelta: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    marginTop: 1,
  },
  pbWeight: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 1,
    color: colors.ink,
  },
  pbUnit: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 1,
  },
  tcount: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1,
  },
  tcountNum: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink2,
    letterSpacing: 1,
  },

  weightChart: {
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    paddingBottom: 6,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  weightLast: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  weightLastNum: {
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: 1,
    color: colors.ink,
    lineHeight: 36,
  },
  weightLastUnit: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.muted,
  },
  weightEmpty: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
  },
  weightInput: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  weightInputField: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.ink,
    borderWidth: border.heavy,
    borderColor: colors.ink,
    paddingVertical: 6,
    paddingHorizontal: 10,
    width: 80,
    textAlign: 'center',
  },
  weightAddBtn: {
    borderWidth: border.heavy,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  weightAddBtnLabel: {
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.bg,
  },
  weightDeleteHint: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 2,
  },
  pbRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  drillBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drillSheet: {
    backgroundColor: colors.bg,
    borderTopWidth: border.heavy,
    borderTopColor: colors.ink,
    maxHeight: '72%',
  },
  drillHandle: {
    width: 32,
    height: 3,
    backgroundColor: colors.ink2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: border.heavy,
    borderBottomColor: colors.ink,
  },
  drillLetterBox: {
    width: 32,
    height: 32,
    borderWidth: border.heavy,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillLetter: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.ink,
  },
  drillTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 1,
    color: colors.ink,
    flex: 1,
  },
  drillTitleAccent: {
    fontStyle: 'italic',
    color: colors.accent,
  },
  drillClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillScroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },

  dangerZone: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: 14,
  },
  dangerLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 8,
  },
  dangerBtn: {
    borderWidth: border.heavy,
    borderColor: colors.accent,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnLabel: {
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.accent,
  },

  topLiftBlock: {
    borderWidth: border.heavy,
    borderColor: colors.ink,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topLiftLeft: { flex: 1, paddingRight: 12 },
  topLiftEyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 8,
    letterSpacing: tracking.widest,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 2,
  },
  topLiftName: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
    lineHeight: 18,
    marginBottom: 4,
  },
  topLiftNameAccent: { fontStyle: 'italic', color: colors.accent },
  topLiftRM: {
    fontFamily: fonts.display,
    fontSize: 36,
    letterSpacing: 1,
    color: colors.ink,
    lineHeight: 36,
  },
  topLiftUnit: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.muted,
  },
  topLiftDelta: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
