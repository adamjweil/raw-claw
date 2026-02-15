import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, style }) => {
  const { colors, spacing, typography, radius } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
      <Text
        style={[
          styles.message,
          {
            color: colors.textSecondary,
            fontSize: typography.body.fontSize,
            marginTop: spacing.md,
          },
        ]}
      >
        {message}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={[
            styles.retryBtn,
            {
              borderColor: colors.accent + '44',
              borderRadius: radius.md,
              marginTop: spacing.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm + 2,
            },
          ]}
        >
          <Ionicons name="refresh" size={16} color={colors.accent} />
          <Text style={[styles.retryText, { color: colors.accent, marginLeft: spacing.sm }]}>
            Retry
          </Text>
        </Pressable>
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
  message: {
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

