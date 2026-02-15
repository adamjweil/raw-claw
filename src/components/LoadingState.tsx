import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface LoadingStateProps {
  message?: string;
  style?: ViewStyle;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message, style }) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={colors.accent} />
      {message && (
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
      )}
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

