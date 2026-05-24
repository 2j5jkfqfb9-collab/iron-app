import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EXERCISES } from '@/data/exercises';
import { colors, fonts, border, tracking } from '@/theme/tokens';
import type { MuscleGroup } from '@/types';

const GROUP_LABELS: Record<MuscleGroup, string> = {
  lower: 'Lower Body',
  push: 'Push',
  pull: 'Pull',
  upper: 'Upper',
  core: 'Core',
  mobility: 'Mobility',
};

const GROUPS: MuscleGroup[] = ['lower', 'push', 'pull', 'upper', 'core', 'mobility'];

type Props = {
  visible: boolean;
  currentExerciseId: string;
  onSelect: (exerciseId: string) => void;
  onClose: () => void;
  mode?: 'swap' | 'add';
};

export function ExercisePickerModal({ visible, currentExerciseId, onSelect, onClose, mode = 'swap' }: Props) {
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<MuscleGroup | null>(null);

  const filtered = EXERCISES.filter((e) => {
    if (e.id === currentExerciseId) return false;
    if (activeGroup && e.muscleGroup !== activeGroup) return false;
    if (query.trim()) return e.name.toLowerCase().includes(query.toLowerCase());
    return true;
  });

  // Group for display
  const grouped = GROUPS.flatMap((g) => {
    const exs = filtered.filter((e) => e.muscleGroup === g);
    if (exs.length === 0) return [];
    return [{ type: 'header' as const, group: g }, ...exs.map((e) => ({ type: 'item' as const, ...e }))];
  });

  const handleClose = () => { setQuery(''); setActiveGroup(null); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{mode === 'add' ? 'Add Exercise' : 'Swap Exercise'}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={styles.closeBtnLabel}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            placeholder="Search..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>

        {/* Group filter pills */}
        <View style={styles.pills}>
          <TouchableOpacity
            style={[styles.pill, activeGroup === null && styles.pillActive]}
            onPress={() => setActiveGroup(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillLabel, activeGroup === null && styles.pillLabelActive]}>
              All
            </Text>
          </TouchableOpacity>
          {GROUPS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.pill, activeGroup === g && styles.pillActive]}
              onPress={() => setActiveGroup(activeGroup === g ? null : g)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillLabel, activeGroup === g && styles.pillLabelActive]}>
                {GROUP_LABELS[g]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.type === 'header' ? `h-${item.group}` : item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.groupHeader}>
                  <Text style={styles.groupLabel}>{GROUP_LABELS[item.group]}</Text>
                </View>
              );
            }
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => { onSelect(item.id); handleClose(); }}
                activeOpacity={0.7}
              >
                <View style={styles.letterBox}>
                  <Text style={styles.letter}>{item.startLetter}</Text>
                </View>
                <Text style={styles.name}>{item.name.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: border.heavy,
    borderBottomColor: colors.ink,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderWidth: border.heavy,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnLabel: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.ink,
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
    flexWrap: 'wrap',
    paddingHorizontal: 22,
    paddingVertical: 8,
    gap: 6,
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
  name: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.ink,
    flex: 1,
  },
});
