import { ColorPalette } from './colors';
import { TypographyScale } from './typography';
import { monoFont } from './typography';

/**
 * Shared markdown styles for @ronradtke/react-native-markdown-display.
 * Accepts theme tokens so it works in both light and dark modes.
 */
export function getMarkdownStyles(colors: ColorPalette, typography: TypographyScale) {
  return {
    body: { color: colors.textSecondary, fontSize: typography.body.fontSize, lineHeight: 24 },
    heading1: { color: colors.text, fontSize: 22, fontWeight: '700' as const, marginBottom: 8, marginTop: 16 },
    heading2: { color: colors.text, fontSize: 19, fontWeight: '700' as const, marginBottom: 6, marginTop: 14 },
    heading3: { color: colors.text, fontSize: 16, fontWeight: '600' as const, marginBottom: 4, marginTop: 12 },
    strong: { fontWeight: '700' as const, color: colors.text },
    em: { fontStyle: 'italic' as const },
    code_inline: {
      fontFamily: monoFont,
      backgroundColor: 'rgba(0,0,0,0.3)',
      color: colors.accent,
      paddingHorizontal: 4,
      borderRadius: 3,
      fontSize: 13,
    },
    code_block: {
      fontFamily: monoFont,
      backgroundColor: 'rgba(0,0,0,0.4)',
      color: '#e2e8f0',
      padding: 12,
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 20,
    },
    fence: {
      fontFamily: monoFont,
      backgroundColor: 'rgba(0,0,0,0.4)',
      color: '#e2e8f0',
      padding: 12,
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 20,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      paddingLeft: 12,
      marginLeft: 0,
      opacity: 0.85,
    },
    link: { color: colors.accent, textDecorationLine: 'underline' as const },
    list_item: { marginBottom: 4 },
    paragraph: { marginTop: 0, marginBottom: 10 },
  };
}

