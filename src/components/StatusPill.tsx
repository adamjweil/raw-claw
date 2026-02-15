import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

type ConnectionState = 'online' | 'thinking' | 'offline';

interface StatusPillProps {
  state: ConnectionState;
  label?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const STATE_CONFIG: Record<ConnectionState, { color: string; defaultLabel: string }> = {
  online: { color: '#10b981', defaultLabel: 'Online' },
  thinking: { color: '#f59e0b', defaultLabel: 'Thinking…' },
  offline: { color: '#ef4444', defaultLabel: 'Offline' },
};

export const StatusPill: React.FC<StatusPillProps> = React.memo(({ state, label, onPress, style }) => {
  const { spacing } = useTheme();
  const config = STATE_CONFIG[state];
  const displayLabel = label || config.defaultLabel;

  const content = (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: config.color + '22',
          paddingHorizontal: spacing.md - 4,
          paddingVertical: spacing.xs + 2,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: '#ccc', marginLeft: spacing.xs + 2 }]}>{displayLabel}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Status: ${displayLabel}`}
        accessibilityHint="Opens settings"
      >
        {content}
      </Pressable>
    );
  }

  return content;
});

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

