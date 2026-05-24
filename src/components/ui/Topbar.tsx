import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, border, tracking } from '@/theme/tokens';

type Props = {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  // Shorthand: render "IRON." brand name on the left
  showBrand?: boolean;
  // Shorthand: render plain meta text in center/right
  metaText?: string;
  metaHighlight?: string;
};

export function Topbar({ left, center, right, showBrand, metaText, metaHighlight }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.slot}>
          {showBrand ? (
            <Text style={styles.brand}>
              IRON<Text style={styles.brandDot}>.</Text>
            </Text>
          ) : (
            left
          )}
        </View>

        <View style={[styles.slot, styles.centerSlot]}>
          {center ??
            (metaText ? (
              <Text style={styles.meta}>
                {metaText}
                {metaHighlight ? <Text style={styles.metaHighlight}>{metaHighlight}</Text> : null}
              </Text>
            ) : null)}
        </View>

        <View style={[styles.slot, styles.rightSlot]}>{right}</View>
      </View>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slot: { flex: 1 },
  centerSlot: { alignItems: 'center' },
  rightSlot: { alignItems: 'flex-end' },
  brand: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  brandDot: { color: colors.accent },
  meta: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  metaHighlight: { color: colors.accent, fontFamily: fonts.sansSemiBold },
  rule: {
    height: border.heavy,
    backgroundColor: colors.ink,
    marginTop: 12,
  },
});
