import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fonts, border, tracking } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'accent';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  height?: number;
  fontSize?: number;
  style?: ViewStyle;
};

export function BarButton({
  label,
  onPress,
  variant = 'accent',
  height = 54,
  fontSize = 18,
  style,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.base, styles[variant], { height }, style]}
    >
      <Text style={[styles.label, styles[`label_${variant}`], { fontSize }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  primary: {
    backgroundColor: colors.ink,
    borderWidth: border.heavy,
    borderColor: colors.ink,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: border.heavy,
    borderColor: colors.ink,
  },
  accent: {
    backgroundColor: colors.accent,
    borderWidth: 0,
  },
  label: {
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: tracking.max,
  },
  label_primary: { color: colors.bg },
  label_secondary: { color: colors.ink },
  label_accent: { color: colors.bg },
});
