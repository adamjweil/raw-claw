import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../services/store';
import { useTheme } from '../theme';

export const OfflineBanner: React.FC = () => {
  const { colors, spacing } = useTheme();
  const { state } = useStore();

  if (state.connected) return null;

  return (
    <View
      style={[
        styles.offlineBanner,
        {
          backgroundColor: colors.error + '22',
          borderColor: colors.error + '44',
          padding: spacing.sm,
          marginBottom: spacing.md,
          borderRadius: 8,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel="You are offline"
    >
      <Ionicons name="cloud-offline" size={16} color={colors.error} />
      <Text style={[styles.offlineText, { color: colors.error, marginLeft: spacing.sm }]}>
        Offline — showing cached data
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  offlineText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

