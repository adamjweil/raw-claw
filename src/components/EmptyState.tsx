import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, message, style }) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={48} color={colors.textMuted + '66'} />
      <Text
        style={[
          styles.message,
          {
            color: colors.textMuted,
            fontSize: typography.body.fontSize,
            marginTop: spacing.md,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  message: {},
});

