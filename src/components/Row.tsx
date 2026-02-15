import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';

interface RowProps {
  label: string;
  value: string;
  valueColor?: string;
  /** When true, shows a copy icon and tapping copies the value to clipboard */
  copyable?: boolean;
  /** The raw value to copy (defaults to `value` prop if not provided) */
  copyValue?: string;
  style?: ViewStyle;
}

export const Row: React.FC<RowProps> = React.memo(({ label, value, valueColor, copyable, copyValue, style }) => {
  const { colors, spacing, typography } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const textToCopy = copyValue ?? value;
    if (!textToCopy || textToCopy === '—') return;
    await Clipboard.setStringAsync(textToCopy);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value, copyValue]);

  const content = (
    <View
      style={[
        styles.row,
        {
          paddingVertical: spacing.sm,
          borderBottomColor: colors.border,
        },
        style,
      ]}
      accessibilityLabel={`${label}: ${value}${copyable ? ', tap to copy' : ''}`}
    >
      <Text style={[styles.label, { color: colors.textMuted, fontSize: typography.label.fontSize }]}>
        {label}
      </Text>
      <View style={styles.valueContainer}>
        <Text
          style={[
            styles.value,
            {
              color: valueColor || colors.textSecondary,
              fontSize: typography.label.fontSize,
              fontWeight: typography.label.fontWeight,
            },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {copyable && (
          <Ionicons
            name={copied ? 'checkmark-circle' : 'copy-outline'}
            size={14}
            color={copied ? colors.success : colors.textMuted}
            style={{ marginLeft: spacing.xs }}
          />
        )}
      </View>
    </View>
  );

  if (copyable) {
    return (
      <Pressable onPress={handleCopy} accessibilityRole="button" accessibilityHint="Copies value to clipboard">
        {content}
      </Pressable>
    );
  }

  return content;
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  label: {},
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '60%',
  },
  value: {
    textAlign: 'right',
    flexShrink: 1,
  },
});
