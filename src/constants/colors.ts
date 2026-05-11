export const Colors = {
  // Brand
  primary: '#6C63FF',      // Violet
  primaryDark: '#5A52E0',
  primaryLight: '#8B84FF',
  accent: '#FF6B6B',       // Coral red for CTAs
  accentGreen: '#4ECDC4',  // Teal for success/progress

  // Backgrounds
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1C1C28',
  card: '#1E1E2E',
  cardBorder: '#2A2A3E',

  // Text
  textPrimary: '#F0F0FF',
  textSecondary: '#9090A8',
  textMuted: '#5A5A72',

  // Semantic
  success: '#4ECDC4',
  warning: '#FFB347',
  error: '#FF6B6B',
  info: '#6C63FF',

  // Goals
  loseWeight: '#FF6B6B',
  buildMuscle: '#6C63FF',
  getLean: '#4ECDC4',
  endurance: '#FFB347',

  // Macros
  protein: '#6C63FF',
  carbs: '#4ECDC4',
  fat: '#FFB347',

  // UI
  border: '#2A2A3E',
  divider: '#1E1E2E',
  overlay: 'rgba(0,0,0,0.7)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorKey = keyof typeof Colors;
