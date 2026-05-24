export const colors = {
  bg: '#F5F0E1',
  surface: '#FFFFFF',
  surface2: '#ECE5D2',
  ink: '#1F2419',
  ink2: '#4A4F40',
  muted: '#A89D7C',
  line: '#1F2419',
  lineSoft: 'rgba(31,36,25,0.15)',
  accent: '#C8412A',
  accentDark: '#8B2A1A',
  good: '#4A5D2A',
} as const;

export const fonts = {
  display: 'Anton',
  sans: 'IBMPlexSans',
  sansMedium: 'IBMPlexSans-Medium',
  sansSemiBold: 'IBMPlexSans-SemiBold',
  sansBold: 'IBMPlexSans-Bold',
  sansItalic: 'IBMPlexSans-Italic',
} as const;

export const border = {
  heavy: 2,
  light: 1.5,
} as const;

// All spacing in dp
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const tracking = {
  tight: 1,
  base: 1.5,
  wide: 2,
  wider: 2.5,
  widest: 3,
  max: 4,
} as const;
