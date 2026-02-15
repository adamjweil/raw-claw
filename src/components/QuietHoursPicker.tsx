import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../theme';
import { NotificationSettings } from '../types';
import {
  getNotificationSettings,
  saveNotificationSettings,
} from '../services/notifications';

export const QuietHoursPicker: React.FC = () => {
  const { colors, spacing, radius, typography } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState('23:00');
  const [endTime, setEndTime] = useState('08:00');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    getNotificationSettings().then((settings) => {
      setEnabled(settings.quietHours.enabled);
      setStartTime(settings.quietHours.start);
      setEndTime(settings.quietHours.end);
    });
  }, []);

  const persist = useCallback(
    async (newEnabled: boolean, newStart: string, newEnd: string) => {
      const settings = await getNotificationSettings();
      const updated: NotificationSettings = {
        ...settings,
        quietHours: {
          enabled: newEnabled,
          start: newStart,
          end: newEnd,
        },
      };
      await saveNotificationSettings(updated);
    },
    []
  );

  const toggleEnabled = useCallback(
    (value: boolean) => {
      setEnabled(value);
      persist(value, startTime, endTime);
    },
    [startTime, endTime, persist]
  );

  const parseTime = (timeStr: string): Date => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const formatTime = (date: Date): string => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const formatDisplayTime = (timeStr: string): string => {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const handleStartChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (date) {
      const formatted = formatTime(date);
      setStartTime(formatted);
      persist(enabled, formatted, endTime);
    }
  };

  const handleEndChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (date) {
      const formatted = formatTime(date);
      setEndTime(formatted);
      persist(enabled, startTime, formatted);
    }
  };

  return (
    <View>
      {/* Enable/Disable row */}
      <View style={[styles.row, { paddingVertical: spacing.sm, borderBottomColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.body.fontSize }]}>
          Enable Quiet Hours
        </Text>
        <Switch
          value={enabled}
          onValueChange={toggleEnabled}
          trackColor={{ false: colors.surface, true: colors.accent + '66' }}
          thumbColor={enabled ? colors.accent : colors.textMuted}
        />
      </View>

      {enabled && (
        <>
          {/* Start time */}
          <Pressable
            style={[styles.row, { paddingVertical: spacing.md, borderBottomColor: colors.border }]}
            onPress={() => setShowStartPicker(!showStartPicker)}
          >
            <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.body.fontSize }]}>
              Start
            </Text>
            <Text style={[styles.timeValue, { color: colors.accent, fontSize: typography.body.fontSize }]}>
              {formatDisplayTime(startTime)}
            </Text>
          </Pressable>
          {showStartPicker && (
            <DateTimePicker
              value={parseTime(startTime)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartChange}
              themeVariant="dark"
            />
          )}

          {/* End time */}
          <Pressable
            style={[styles.row, { paddingVertical: spacing.md, borderBottomColor: colors.border }]}
            onPress={() => setShowEndPicker(!showEndPicker)}
          >
            <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.body.fontSize }]}>
              End
            </Text>
            <Text style={[styles.timeValue, { color: colors.accent, fontSize: typography.body.fontSize }]}>
              {formatDisplayTime(endTime)}
            </Text>
          </Pressable>
          {showEndPicker && (
            <DateTimePicker
              value={parseTime(endTime)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndChange}
              themeVariant="dark"
            />
          )}

          <Text
            style={[
              styles.description,
              {
                color: colors.textMuted,
                fontSize: typography.caption.fontSize,
                marginTop: spacing.sm,
                padding: spacing.xs,
              },
            ]}
          >
            Non-critical notifications will be suppressed during quiet hours. Critical alerts (arb alerts) will still come through.
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  label: {
    fontWeight: '500',
  },
  timeValue: {
    fontWeight: '600',
  },
  description: {
    lineHeight: 18,
  },
});

