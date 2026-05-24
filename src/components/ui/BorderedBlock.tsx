import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, border } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
};

export function BorderedBlock({ children, style, padding = 12 }: Props) {
  return (
    <View style={[styles.block, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderWidth: border.heavy,
    borderColor: colors.ink,
    borderRadius: 0,
  },
});
