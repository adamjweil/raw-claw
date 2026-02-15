/**
 * PAW Spacing Scale
 * Consistent spacing values used throughout the app.
 */

export interface SpacingScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export const spacing: SpacingScale = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export interface RadiusScale {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export const radius: RadiusScale = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

