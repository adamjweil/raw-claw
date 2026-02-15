import { Platform } from 'react-native';

/**
 * PAW Typography Scale
 * Consistent font sizes, weights, and line heights.
 */

export interface TypographyStyle {
  fontSize: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
  lineHeight?: number;
}

export interface TypographyScale {
  /** Page titles (28-32px) */
  title: TypographyStyle;
  /** Section / card titles (16px) */
  heading: TypographyStyle;
  /** Modal titles (20-22px) */
  modalTitle: TypographyStyle;
  /** Body text (15px) */
  body: TypographyStyle;
  /** Secondary / label text (14px) */
  label: TypographyStyle;
  /** Small text (13px) */
  small: TypographyStyle;
  /** Caption / timestamp text (12px) */
  caption: TypographyStyle;
  /** Tiny text (11px) */
  tiny: TypographyStyle;
}

export const typography: TypographyScale = {
  title: { fontSize: 28, fontWeight: '600', lineHeight: 34 },
  heading: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  modalTitle: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  small: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  tiny: { fontSize: 11, fontWeight: '600', lineHeight: 14 },
};

export const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

