import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Share, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useHistoryStore } from '@/store/historyStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUnitStore } from '@/store/unitStore';
import { exerciseById } from '@/data/exercises';
import { buildComparisons } from '@/utils/comparison';
import { TEMPLATES } from '@/data/templates';
import { colors, fonts, border, tracking } from '@/theme/tokens';

const KG_TO_LB = 2.20462;
import { Topbar } from '@/components/ui/Topbar';
import { IconBtn } from '@/components/ui/IconBtn';
import type { Comparison } from '@/types';

const RPE_WORDS = ['', 'easy', 'light', 'light', 'smooth', 'moderate', 'tough', 'solid', 'hard', 'very hard', 'max'];

function deltaColor(kind: Comparison['delta']): string {
  switch (kind) {
    case 'up': return colors.good;
    case 'down': return colors.accent;
    case 'pr': return colors.accent;
    default: return colors.muted;
  }
}

export default function SummaryScreen() {
  const router = useRouter();
  const [note, setNote] = useState('');
  const sessions = useHistoryStore((s) => s.sessions);
  const previousSession = useHistoryStore((s) => s.previousSession);
  const updateNote = useHistoryStore((s) => s.updateNote);
  const endWorkout = useWorkoutStore((s) => s.endWorkout);
  const unit = useUnitStore((s) => s.unit);

  const latest = sessions[0] ?? null;
  const previous = latest ? previousSession(latest.templateId, latest.id) : null;

  const comparisons = latest ? buildComparisons(latest, previous) : [];
  const prs = comparisons.filter((c) => c.delta === 'pr');
  const firstPR = prs[0];

  const duration = latest?.endedAt && latest?.startedAt
    ? Math.floor((new Date(latest.endedAt).getTime() - new Date(latest.startedAt).getTime()) / 1000)
    : 0;
  const dMin = String(Math.floor(duration / 60)).padStart(2, '0');
  const dSec = String(duration % 60).padStart(2, '0');

  const template = TEMPLATES.find((t) => t.id === latest?.templateId);
  const templateName = latest?.templateName ?? template?.name ?? '—';

  const allSets = latest?.exercises.flatMap((e) => e.sets) ?? [];
  const avgRpe = allSets.length > 0
    ? Math.round(allSets.reduce((sum, s) => sum + s.rpe, 0) / allSets.length)
    : 7;
  const totalVolume = allSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  const totalSets = allSets.length;

  const handleDone = () => {
    if (latest && note.trim()) updateNote(latest.id, note.trim());
    endWorkout();
    router.replace('/');
  };

  const handleShare = async () => {
    const lines = [
      `Iron. · ${templateName}`,
      `${dMin}:${dSec} · ${latest?.exercises.length ?? 0} exercises · RPE ${avgRpe}`,
      '',
      ...comparisons.map((c) => `${c.exerciseName}  ${c.text}`),
    ];
    await Share.share({ message: lines.join('\n') });
  };

  const upCount = comparisons.filter((c) => c.delta === 'up' || c.delta === 'pr').length;
  const sameCount = comparisons.filter((c) => c.delta === 'same').length;
  const downCount = comparisons.filter((c) => c.delta === 'down').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Topbar
          left={
            <IconBtn onPress={handleDone}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round">
                <Path d="M18 6L6 18M6 6l12 12" />
              </Svg>
            </IconBtn>
          }
          center={<Text style={styles.completedMeta}>✓ Completed</Text>}
          right={<View style={{ width: 36 }} />}
        />

        <Text style={styles.eyebrow}>Workout Complete</Text>
        <Text style={styles.headline}>
          {dMin}<Text style={styles.headlineAccent}>:</Text>{dSec}
        </Text>
        <Text style={styles.subline}>
          {templateName} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
        </Text>
        <View style={styles.miniStats}>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatNum}>{latest?.exercises.length ?? 0}</Text>
            <Text style={styles.miniStatLabel}>Exercises</Text>
          </View>
          <View style={styles.miniStatDiv} />
          <View style={styles.miniStat}>
            <Text style={styles.miniStatNum}>{totalSets}</Text>
            <Text style={styles.miniStatLabel}>Sets</Text>
          </View>
          <View style={styles.miniStatDiv} />
          <View style={styles.miniStat}>
            <Text style={styles.miniStatNum}>
              {Math.round(unit === 'lb' ? totalVolume * KG_TO_LB : totalVolume).toLocaleString()}
            </Text>
            <Text style={styles.miniStatLabel}>Vol {unit.toUpperCase()}</Text>
          </View>
        </View>

        {/* PR poster */}
        {firstPR && (
          <View style={styles.prPoster}>
            <Text style={styles.prEyebrow}>↑ Personal Record</Text>
            <Text style={styles.prTitle}>
              {exerciseById(firstPR.exerciseId)?.name.split(' ').slice(0, -1).join(' ')}{' '}
              <Text style={styles.prTitleAccent}>
                {exerciseById(firstPR.exerciseId)?.name.split(' ').slice(-1)[0]}
              </Text>
            </Text>
            <View style={styles.prStatRow}>
              <Text style={styles.prOld}>Previous best</Text>
              <Text style={styles.prNew}>{firstPR.text.replace('↑ PR · ', '')}</Text>
            </View>
            <Text style={styles.prWatermark}>PR</Text>
          </View>
        )}

        {/* Comparison table */}
        <View style={styles.cmpCard}>
          <View style={styles.cmpHead}>
            <Text style={styles.cmpHeadLabel}>VS. Last Time</Text>
            <Text style={styles.cmpSummary}>
              <Text style={styles.cmpSummaryBold}>{upCount}</Text> ↑ ·{' '}
              <Text style={styles.cmpSummaryBold}>{sameCount}</Text> = ·{' '}
              <Text style={styles.cmpSummaryBold}>{downCount}</Text> ↓
            </Text>
          </View>
          {comparisons.map((c) => (
            <View key={c.exerciseId} style={styles.cmpRow}>
              <Text style={styles.cmpName}>{c.exerciseName}</Text>
              <Text style={[styles.cmpDelta, { color: deltaColor(c.delta) }]}>{c.text}</Text>
            </View>
          ))}
        </View>

        {/* Effort */}
        <View style={styles.effort}>
          <View>
            <Text style={styles.effortLabel}>Your Effort</Text>
            <Text style={styles.effortFeel}>{RPE_WORDS[avgRpe] ?? 'solid'}</Text>
          </View>
          <Text style={styles.effortVal}>
            {avgRpe}<Text style={styles.effortUnit}>/10</Text>
          </Text>
        </View>

        {/* Note */}
        <View style={styles.noteCard}>
          <View style={styles.noteHead}>
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.ink2} strokeWidth={2}>
              <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </Svg>
            <Text style={styles.noteLabel}>Note</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="How did it feel? Energy, grind, injuries, small wins..."
            placeholderTextColor={colors.muted}
            multiline
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionShare} activeOpacity={0.7} onPress={handleShare}>
            <Text style={styles.actionShareLabel}>Share</Text>
          </TouchableOpacity>
          <View style={{ width: border.heavy, backgroundColor: colors.ink }} />
          <TouchableOpacity style={styles.actionDone} onPress={handleDone} activeOpacity={0.8}>
            <Text style={styles.actionDoneLabel}>Done</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 40 },

  completedMeta: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: tracking.widest, textTransform: 'uppercase', color: colors.accent },

  eyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: tracking.widest, textTransform: 'uppercase', color: colors.accent, marginTop: 8 },
  headline: { fontFamily: fonts.display, fontSize: 96, lineHeight: 82, letterSpacing: 2, color: colors.ink, marginTop: 6 },
  headlineAccent: { fontStyle: 'italic', color: colors.accent },
  subline: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: tracking.wide, textTransform: 'uppercase', color: colors.ink2, marginTop: 10 },
  miniStats: {
    flexDirection: 'row',
    borderTopWidth: border.heavy,
    borderBottomWidth: border.heavy,
    borderColor: colors.ink,
    marginTop: 10,
    marginBottom: 0,
  },
  miniStat: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  miniStatDiv: { width: border.heavy, backgroundColor: colors.ink },
  miniStatNum: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 1, color: colors.ink, lineHeight: 26 },
  miniStatLabel: { fontFamily: fonts.sansMedium, fontSize: 8, letterSpacing: tracking.wide, textTransform: 'uppercase', color: colors.muted, marginTop: 2 },

  prPoster: { marginTop: 14, backgroundColor: colors.ink, padding: 18, position: 'relative', overflow: 'hidden' },
  prEyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: tracking.widest, textTransform: 'uppercase', color: colors.accent },
  prTitle: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 28, color: colors.bg, marginVertical: 6 },
  prTitleAccent: { fontStyle: 'italic', color: colors.accent },
  prStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(245,240,225,0.2)', position: 'relative', zIndex: 2 },
  prOld: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  prNew: { fontFamily: fonts.display, fontSize: 32, letterSpacing: 1, color: colors.bg },
  prWatermark: { position: 'absolute', right: -20, bottom: -50, fontFamily: fonts.display, fontSize: 200, color: 'rgba(245,240,225,0.07)', lineHeight: 200 },

  cmpCard: { marginTop: 14, borderTopWidth: border.heavy, borderTopColor: colors.ink },
  cmpHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  cmpHeadLabel: { fontFamily: fonts.display, fontSize: 14, letterSpacing: tracking.wide, textTransform: 'uppercase', color: colors.ink },
  cmpSummary: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.5, color: colors.ink2 },
  cmpSummaryBold: { fontFamily: fonts.sansBold, color: colors.ink },
  cmpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  cmpName: { fontFamily: fonts.sansSemiBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink },
  cmpDelta: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.5 },

  effort: { marginTop: 14, borderWidth: border.heavy, borderColor: colors.ink, padding: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  effortLabel: { fontFamily: fonts.sansSemiBold, fontSize: 9, letterSpacing: tracking.wider, textTransform: 'uppercase', color: colors.accent },
  effortFeel: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink, marginTop: 4 },
  effortVal: { fontFamily: fonts.display, fontSize: 54, letterSpacing: 1, color: colors.ink, lineHeight: 54 },
  effortUnit: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink2, marginLeft: 2 },

  noteCard: { marginTop: 10, borderWidth: border.heavy, borderColor: colors.ink, padding: 10, paddingHorizontal: 12 },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  noteLabel: { fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: tracking.wide, textTransform: 'uppercase', color: colors.ink2 },
  noteInput: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink, minHeight: 24, lineHeight: 20 },

  actions: { marginTop: 14, flexDirection: 'row', borderWidth: border.heavy, borderColor: colors.ink },
  actionShare: { flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  actionShareLabel: { fontFamily: fonts.display, fontSize: 16, letterSpacing: tracking.widest, textTransform: 'uppercase', color: colors.ink },
  actionDone: { flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink, borderLeftWidth: border.heavy, borderLeftColor: colors.ink },
  actionDoneLabel: { fontFamily: fonts.display, fontSize: 16, letterSpacing: tracking.widest, textTransform: 'uppercase', color: colors.bg },
});
