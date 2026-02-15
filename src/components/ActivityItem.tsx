import React, { useCallback } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { ActivityEvent } from '../types';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  chat: 'chatbubble',
  cron: 'timer',
  channel: 'radio',
  system: 'settings',
};

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface ActivityItemProps {
  event: ActivityEvent;
  onPress?: (event: ActivityEvent) => void;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ event, onPress }) => {
  const { colors, spacing } = useTheme();
  const iconName =
    (event.icon as keyof typeof Ionicons.glyphMap) ||
    CATEGORY_ICONS[event.category] ||
    'ellipse';

  const handlePress = useCallback(() => {
    onPress?.(event);
  }, [onPress, event]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.activityRow,
        { paddingVertical: spacing.sm, borderBottomColor: colors.border },
        pressed && onPress ? { opacity: 0.6, backgroundColor: colors.surface } : undefined,
      ]}
      accessibilityRole="button"
      accessibilityLabel={event.text}
    >
      <Ionicons
        name={iconName}
        size={14}
        color={colors.textMuted}
        style={{ marginRight: spacing.sm }}
      />
      <Text
        style={[styles.activityText, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {event.text}
      </Text>
      <Text
        style={[
          styles.activityTime,
          { color: colors.textMuted, marginLeft: spacing.sm },
        ]}
      >
        {relativeTime(event.timestamp)}
      </Text>
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.textMuted}
          style={{ marginLeft: 4 }}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  activityText: { fontSize: 13, flex: 1 },
  activityTime: { fontSize: 12 },
});
