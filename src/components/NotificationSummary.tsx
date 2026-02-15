import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useNotifications } from '../hooks';

const CATEGORIES = [
  { name: 'Arb Alerts', key: 'arb_alert', icon: 'trending-up' as const },
  { name: 'Cron Results', key: 'cron_result', icon: 'timer' as const },
  { name: 'Reminders', key: 'reminder', icon: 'notifications' as const },
];

export const NotificationSummary: React.FC = () => {
  const { colors, spacing } = useTheme();
  const { unreadByCategory } = useNotifications();

  const totalUnread = CATEGORIES.reduce((sum, cat) => sum + (unreadByCategory[cat.key] || 0), 0);

  return (
    <>
      {CATEGORIES.map((cat) => {
        const count = unreadByCategory[cat.key] || 0;
        return (
          <View
            key={cat.name}
            style={[styles.notifRow, { paddingVertical: spacing.sm, borderBottomColor: colors.border }]}
            accessibilityLabel={`${cat.name}: ${count} unread`}
          >
            <Ionicons name={cat.icon} size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
            <Text style={[styles.notifName, { color: colors.textSecondary }]}>{cat.name}</Text>
            <Text style={[styles.notifCount, { color: count > 0 ? colors.accent : colors.textMuted }]}>
              {count}
            </Text>
          </View>
        );
      })}
      {totalUnread === 0 && (
        <Text style={[styles.noNotifs, { color: colors.textMuted, marginTop: spacing.sm }]}>
          No new notifications
        </Text>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  notifName: { flex: 1, fontSize: 14 },
  notifCount: { fontSize: 14, fontWeight: '700' },
  noNotifs: { fontSize: 13, textAlign: 'center' },
});

