/**
 * PAW Color Palette
 * Centralized color definitions for the entire app.
 */

export interface ColorPalette {
  /** Primary background */
  bg: string;
  /** Elevated surface (cards, tab bar borders) */
  surface: string;
  /** Card / tile backgrounds */
  card: string;
  /** Accent / interactive color */
  accent: string;
  /** Primary text */
  text: string;
  /** Secondary text (labels, subtitles) */
  textSecondary: string;
  /** Muted text (timestamps, placeholders) */
  textMuted: string;
  /** Success color */
  success: string;
  /** Error / danger color */
  error: string;
  /** Warning color */
  warning: string;
  /** Info / neutral blue */
  info: string;
  /** Subtle borders */
  border: string;
  /** Overlay backdrop */
  overlay: string;
}

export const darkColors: ColorPalette = {
  bg: '#0a0a0f',
  surface: '#1a1a2e',
  card: '#16213e',
  accent: '#0ea5e9',
  text: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#888888',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  border: 'rgba(255,255,255,0.05)',
  overlay: 'rgba(0,0,0,0.6)',
};

export const lightColors: ColorPalette = {
  bg: '#f8f9fa',
  surface: '#ffffff',
  card: '#ffffff',
  accent: '#0284c7',
  text: '#1a1a2e',
  textSecondary: '#4a4a5a',
  textMuted: '#8a8a9a',
  success: '#059669',
  error: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
  border: 'rgba(0,0,0,0.08)',
  overlay: 'rgba(0,0,0,0.4)',
};
