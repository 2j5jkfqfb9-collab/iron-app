import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { colors, fonts, tracking } from '@/theme/tokens';

type Props = {
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: TextStyle;
  accent?: boolean;
};

export function Label({ children, size = 9, color, style, accent }: Props) {
  return (
    <Text
      style={[
        styles.base,
        { fontSize: size, color: color ?? (accent ? colors.accent : colors.ink2) },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.sansMedium,
    letterSpacing: tracking.wide,
    textTransform: 'uppercase',
  },
});
