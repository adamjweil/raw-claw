import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { NotificationSettings } from '../types';
import {
  getNotificationSettings,
  saveNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../services/notifications';

interface CategoryConfig {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'arb_alert', label: 'Arb Alerts', icon: 'trending-up' },
  { key: 'cron_result', label: 'Cron Results', icon: 'timer' },
  { key: 'reminder', label: 'Reminders', icon: 'notifications' },
  { key: 'system', label: 'System', icon: 'settings' },
];

export const NotificationSettingsCard: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  useEffect(() => {
    getNotificationSettings().then(setSettings);
  }, []);

  const toggleSetting = useCallback(
    async (category: string, field: 'push' | 'sound' | 'badge', value: boolean) => {
      const updated: NotificationSettings = {
        ...settings,
        categories: {
          ...settings.categories,
          [category]: {
            ...settings.categories[category],
            [field]: value,
          },
        },
      };
      setSettings(updated);
      await saveNotificationSettings(updated);
    },
    [settings]
  );

  return (
    <View>
      {/* Column headers */}
      <View style={[styles.headerRow, { paddingBottom: spacing.sm, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerLabel, { color: colors.textMuted, flex: 1, fontSize: typography.caption.fontSize }]}>
          Category
        </Text>
        <Text style={[styles.colHeader, { color: colors.textMuted, fontSize: typography.tiny.fontSize }]}>Push</Text>
        <Text style={[styles.colHeader, { color: colors.textMuted, fontSize: typography.tiny.fontSize }]}>Sound</Text>
        <Text style={[styles.colHeader, { color: colors.textMuted, fontSize: typography.tiny.fontSize }]}>Badge</Text>
      </View>

      {CATEGORIES.map((cat) => {
        const catSettings = settings.categories[cat.key] || { push: true, sound: false, badge: true };
        return (
          <View
            key={cat.key}
            style={[
              styles.catRow,
              { paddingVertical: spacing.sm + 2, borderBottomColor: colors.border },
            ]}
          >
            <View style={[styles.catLabel, { gap: spacing.sm }]}>
              <Ionicons name={cat.icon} size={16} color={colors.textMuted} />
              <Text
                style={[styles.catName, { color: colors.textSecondary, fontSize: typography.label.fontSize }]}
              >
                {cat.label}
              </Text>
            </View>
            <Switch
              value={catSettings.push}
              onValueChange={(v) => toggleSetting(cat.key, 'push', v)}
              trackColor={{ false: colors.surface, true: colors.accent + '66' }}
              thumbColor={catSettings.push ? colors.accent : colors.textMuted}
              style={styles.switch}
            />
            <Switch
              value={catSettings.sound}
              onValueChange={(v) => toggleSetting(cat.key, 'sound', v)}
              trackColor={{ false: colors.surface, true: colors.accent + '66' }}
              thumbColor={catSettings.sound ? colors.accent : colors.textMuted}
              style={styles.switch}
            />
            <Switch
              value={catSettings.badge}
              onValueChange={(v) => toggleSetting(cat.key, 'badge', v)}
              trackColor={{ false: colors.surface, true: colors.accent + '66' }}
              thumbColor={catSettings.badge ? colors.accent : colors.textMuted}
              style={styles.switch}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerLabel: {},
  colHeader: {
    width: 56,
    textAlign: 'center',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  catLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catName: {
    fontWeight: '500',
  },
  switch: {
    width: 56,
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
});

