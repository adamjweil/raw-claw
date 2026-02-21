import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../services/store';
import { useTheme } from '../theme';

export const DemoBanner: React.FC = () => {
  const { colors, spacing } = useTheme();
  const { state, deactivateDemoMode } = useStore();

  if (!state.isDemoMode) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.accent + '18',
          borderColor: colors.accent + '44',
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: spacing.sm,
          marginBottom: spacing.md,
          borderRadius: 8,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel="Demo mode active"
    >
      <Ionicons name="flask" size={14} color={colors.accent} />
      <Text style={[styles.text, { color: colors.accent, marginLeft: spacing.xs + 2 }]}>
        Demo Mode — using sample data
      </Text>
      <Pressable
        onPress={deactivateDemoMode}
        hitSlop={8}
        style={[styles.exitBtn, { marginLeft: 'auto' }]}
        accessibilityRole="button"
        accessibilityLabel="Exit demo mode"
      >
        <Text style={[styles.exitText, { color: colors.accent }]}>Exit</Text>
        <Ionicons name="close" size={14} color={colors.accent} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  exitText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
