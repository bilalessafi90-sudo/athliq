import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Base design width = 390pt (iPhone 14 standard).
// moderateScale applies only a fraction of the proportional change so
// text doesn't become extreme on very large/small screens.
function ms(size: number, factor = 0.35): number {
  const scaled = size * (SCREEN_WIDTH / 390);
  return Math.round(PixelRatio.roundToNearestPixel(size + (scaled - size) * factor));
}

export const Typography = {
  sizes: {
    xs: ms(11),
    sm: ms(13),
    base: ms(15),
    md: ms(17),
    lg: ms(20),
    xl: ms(24),
    '2xl': ms(28),
    '3xl': ms(34),
    '4xl': ms(40),
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};
