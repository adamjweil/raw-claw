import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface RowProps {
  label: string;
  value: string;
  valueColor?: string;
  style?: ViewStyle;
}

export const Row: React.FC<RowProps> = React.memo(({ label, value, valueColor, style }) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          paddingVertical: spacing.sm,
          borderBottomColor: colors.border,
        },
        style,
      ]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={[styles.label, { color: colors.textMuted, fontSize: typography.label.fontSize }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.value,
          {
            color: valueColor || colors.textSecondary,
            fontSize: typography.label.fontSize,
            fontWeight: typography.label.fontWeight,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  label: {},
  value: {
    maxWidth: '60%',
    textAlign: 'right',
  },
});

