import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { colors, border } from '@/theme/tokens';

type Props = {
  onPress?: () => void;
  children: React.ReactNode;
  size?: number;
};

export function IconBtn({ onPress, children, size = 36 }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.btn, { width: size, height: size }]}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: border.light,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
});
