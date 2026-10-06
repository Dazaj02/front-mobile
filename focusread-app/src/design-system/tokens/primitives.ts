// Nivel 1: valores crudos. Nada aquí conoce temas ni componentes.
export const colorPrimitives = {
  white: '#FFFFFF',
  // paper
  paper50: '#FBF8FF',
  paper100: '#EEEDF7',
  paper200: '#C4C5D7',
  paper500: '#747686',
  paper600: '#5E6070',
  paper700: '#434655',
  paper900: '#1A1B22',
  // sepia
  sepia50: '#F5EEDB',
  sepia100: '#FBF6E9',
  sepia150: '#EDE3C9',
  sepia200: '#DCCFB0',
  sepia300: '#F3E3C3',
  sepia500: '#8A7760',
  sepia600: '#6E5C47',
  sepia700: '#5A4A38',
  sepia900: '#2B2118',
  // dark
  gray800: '#2E2E2E',
  gray900: '#1E1E1E',
  gray925: '#1A1A1A',
  gray950: '#121212',
  gray500: '#8F8F8F',
  gray300: '#B8B8B8',
  gray100: '#E6E6E6',
  navy900: '#0B1B3A',
  navy700: '#1F2A40',
  // acentos
  blue900: '#0037B0',
  blue700: '#1D4ED8',
  blue100: '#DCE1FF',
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
  red700: '#BA1A1A',
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
