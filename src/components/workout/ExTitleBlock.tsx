import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Polyline, Path } from 'react-native-svg';
import { colors, fonts, border, tracking } from '@/theme/tokens';
import { Label } from '@/components/ui/Label';

type Props = {
  startLetter: string;
  name: string;
  accentWord?: string;
  previousText?: string;
  suggestion?: string;
  onApplySuggestion?: () => void;
  onSwap?: () => void;
  onHistory?: () => void;
  historyActive?: boolean;
};

export function ExTitleBlock({ startLetter, name, accentWord, previousText, suggestion, onApplySuggestion, onSwap, onHistory, historyActive }: Props) {
  // Split name into base and accent word
  const words = name.split(' ');
  const last = words[words.length - 1];
  const base = words.slice(0, -1).join(' ');

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.letterBox}>
            <Text style={styles.letter}>{startLetter}</Text>
          </View>
          <View>
            <Label size={9}>Current Exercise</Label>
            <Text style={styles.name}>
              {base ? `${base} ` : ''}
              <Text style={styles.nameAccent}>{accentWord ?? last}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.btns}>
          {onHistory && (
            <TouchableOpacity
              style={[styles.iconBtn, historyActive && styles.iconBtnActive]}
              onPress={onHistory}
              activeOpacity={0.7}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={historyActive ? colors.bg : colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 8v4l3 3" />
                <Path d="M3.05 11a9 9 0 1 1 .5 4" />
                <Path d="M3 16H1v-5" />
              </Svg>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={onSwap} activeOpacity={0.7}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Polyline points="17 1 21 5 17 9" />
              <Path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <Polyline points="7 23 3 19 7 15" />
              <Path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      {previousText && (
        <Text style={styles.prev}>
          Previous: <Text style={styles.prevBold}>{previousText}</Text>
        </Text>
      )}
      {suggestion && (
        onApplySuggestion ? (
          <TouchableOpacity onPress={onApplySuggestion} activeOpacity={0.7} style={styles.suggestionBtn}>
            <Text style={styles.suggestion}>{suggestion}</Text>
            <Text style={styles.suggestionApply}>TAP TO APPLY</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.suggestion}>{suggestion}</Text>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 4,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  letterBox: {
    width: 48,
    height: 48,
    borderWidth: border.heavy,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  letter: {
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: 1,
    color: colors.ink,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 31,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  nameAccent: {
    fontStyle: 'italic',
    color: colors.accent,
  },
  btns: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderWidth: border.light,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  iconBtnActive: {
    backgroundColor: colors.ink,
  },
  prev: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 4,
  },
  prevBold: {
    color: colors.ink2,
    fontFamily: fonts.sansSemiBold,
  },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  suggestion: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  suggestionApply: {
    fontFamily: fonts.sansMedium,
    fontSize: 8,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.muted,
    borderWidth: 1,
    borderColor: colors.muted,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
});
