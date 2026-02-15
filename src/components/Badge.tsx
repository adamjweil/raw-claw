import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

type BadgeStatus = 'success' | 'error' | 'pending' | 'running' | null;

interface BadgeProps {
  status: BadgeStatus;
  label?: string;
  style?: ViewStyle;
}

const STATUS_COLORS: Record<string, string> = {
  success: '#10b981',
  error: '#ef4444',
  running: '#f59e0b',
  pending: '#888888',
};

export const Badge: React.FC<BadgeProps> = React.memo(({ status, label, style }) => {
  const statusKey = status || 'pending';
  const color = STATUS_COLORS[statusKey] || '#888888';
  const displayLabel = label || statusKey;

  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }, style]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{displayLabel}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

