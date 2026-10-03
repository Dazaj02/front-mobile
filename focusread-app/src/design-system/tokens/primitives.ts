// Nivel 1: valores crudos. Nada aquí conoce temas ni componentes.
export const colorPrimitives = {
  white: '#FFFFFF',
  // paper (editorial: papel cálido + tinta)
  paper50: '#F7F4EE',
  paper100: '#ECE7DD',
  paper200: '#E2DDD3',
  paper300: '#C9C3B6',
  paper500: '#7D776C',
  paper600: '#6B675F',
  paper700: '#4A4740',
  paper800: '#47443D',
  paper900: '#1B1A17',
  // sepia
  sepia50: '#F5EEDB',
  sepia100: '#FBF6E9',
  sepia150: '#EDE3C9',
  sepia200: '#DCCFB0',
  sepia300: '#F3E3C3',
  sepia500: '#8A7760',
  sepia600: '#6E5C47',
  sepia700: '#5A4A38',
  sepia800: '#4A3D30',
  sepia900: '#2B2118',
  // dark
  gray600: '#4A4A4A',
  gray700: '#3D3D3D',
  gray800: '#2E2E2E',
  gray900: '#1E1E1E',
  gray925: '#1A1A1A',
  gray950: '#121212',
  gray500: '#8F8F8F',
  gray300: '#B8B8B8',
  gray400: '#BDBDBD',
  gray100: '#E6E6E6',
  navy900: '#0B1B3A',
  navy700: '#1F2A40',
  // acentos
  indigo900: '#1A2F80',
  indigo700: '#2340A8',
  indigo100: '#DCE2F5',
  blue900: '#1E40AF',
  blue700: '#1D4ED8',
  blue100: '#E0E7FF',
  blue300: '#8AB4F8',
  blue200: '#AECBFA',
  amber900: '#78350F',
  amber800: '#92400E',
  // estados
  green700: '#15803D',
  green800: '#166534',
  green300: '#6DD58C',
  yellow700: '#A16207',
  yellow800: '#854D0E',
  yellow300: '#FDD663',
  red700: '#B91C1C',
  rose800: '#9F1239',
  red200: '#F2B8B5',
  // scrims
  scrimNeutral: 'rgba(0,0,0,0.4)',
  scrimSepia: 'rgba(43,33,24,0.4)',
  scrimDark: 'rgba(0,0,0,0.6)',
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const elevation = { level0: 0, level1: 1, level2: 3, level3: 6 } as const;

export const opacity = { disabled: 0.38, pressedOverlay: 0.12, scrim: 0.4 } as const;

export const borderWidth = { thin: 1, thick: 2 } as const;

export const sizes ={ touchMin: 48, iconSm: 20, iconMd: 24, iconLg: 32 } as const;
