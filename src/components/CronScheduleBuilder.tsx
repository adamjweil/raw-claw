import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface CronScheduleBuilderProps {
  value: string;
  onChange: (cron: string, human: string) => void;
}

interface PresetOption {
  label: string;
  cron: string;
  human: string;
}

const PRESETS: PresetOption[] = [
  { label: 'Every 15 min', cron: '*/15 * * * *', human: 'Every 15 minutes' },
  { label: 'Every hour', cron: '0 * * * *', human: 'Every hour' },
  { label: 'Daily at 9 AM', cron: '0 9 * * *', human: 'Every day at 9:00 AM' },
  { label: 'Daily at 6 PM', cron: '0 18 * * *', human: 'Every day at 6:00 PM' },
  { label: 'Weekly on Monday', cron: '0 9 * * 1', human: 'Every Monday at 9:00 AM' },
  { label: 'Every 30 min', cron: '*/30 * * * *', human: 'Every 30 minutes' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function cronToHuman(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour, dom, , dow] = parts;

  const preset = PRESETS.find((p) => p.cron === cron);
  if (preset) return preset.human;

  let desc = 'Runs';

  if (min.startsWith('*/')) {
    desc += ` every ${min.slice(2)} minutes`;
  } else if (hour.startsWith('*/')) {
    desc += ` every ${hour.slice(2)} hours`;
  } else if (hour !== '*' && min !== '*') {
    const h = parseInt(hour, 10);
    const m = parseInt(min, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    desc += ` at ${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  if (dow !== '*') {
    const dayIdx = parseInt(dow, 10);
    if (dayIdx >= 0 && dayIdx <= 6) {
      desc += ` on ${WEEKDAYS[dayIdx]}`;
    }
  } else if (dom !== '*') {
    desc += ` on day ${dom}`;
  } else if (hour !== '*' && !hour.startsWith('*/')) {
    desc += ' every day';
  }

  return desc;
}

export const CronScheduleBuilder: React.FC<CronScheduleBuilderProps> = ({
  value,
  onChange,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [mode, setMode] = useState<'preset' | 'custom'>(
    PRESETS.some((p) => p.cron === value) ? 'preset' : value ? 'custom' : 'preset'
  );
  const [customCron, setCustomCron] = useState(value || '* * * * *');

  const humanPreview = useMemo(() => cronToHuman(customCron), [customCron]);

  const selectPreset = (preset: PresetOption) => {
    setCustomCron(preset.cron);
    onChange(preset.cron, preset.human);
  };

  const applyCustom = (cron: string) => {
    setCustomCron(cron);
    const parts = cron.trim().split(/\s+/);
    if (parts.length === 5) {
      onChange(cron, cronToHuman(cron));
    }
  };

  return (
    <View style={styles.container}>
      {/* Mode switch */}
      <View style={[styles.modeRow, { marginBottom: spacing.md }]}>
        {(['preset', 'custom'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[
              styles.modeBtn,
              {
                backgroundColor: mode === m ? colors.accent + '22' : colors.surface,
                borderRadius: radius.md,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
                borderWidth: mode === m ? 1 : 0,
                borderColor: colors.accent + '44',
              },
            ]}
          >
            <Text
              style={{
                color: mode === m ? colors.accent : colors.textMuted,
                fontSize: typography.body.fontSize,
                fontWeight: mode === m ? '600' : '400',
              }}
            >
              {m === 'preset' ? 'Presets' : 'Custom'}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'preset' ? (
        <View style={[styles.presetGrid, { gap: spacing.sm }]}>
          {PRESETS.map((preset) => {
            const isActive = value === preset.cron;
            return (
              <Pressable
                key={preset.cron}
                onPress={() => selectPreset(preset)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isActive ? colors.accent + '22' : colors.card,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    borderWidth: 1,
                    borderColor: isActive ? colors.accent + '66' : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isActive ? colors.accent : colors.text,
                    fontSize: typography.body.fontSize,
                    fontWeight: '500',
                  }}
                >
                  {preset.label}
                </Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.small.fontSize,
                    marginTop: 2,
                  }}
                >
                  {preset.human}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.small.fontSize,
              marginBottom: spacing.sm,
            }}
          >
            Enter cron expression (minute hour day month weekday)
          </Text>
          <TextInput
            style={[
              styles.cronInput,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: 16,
                borderColor: colors.border,
                fontFamily: 'monospace',
              },
            ]}
            value={customCron}
            onChangeText={applyCustom}
            placeholder="*/15 * * * *"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View
            style={[
              styles.preview,
              {
                backgroundColor: colors.accent + '11',
                borderRadius: radius.sm,
                padding: spacing.md,
                marginTop: spacing.md,
              },
            ]}
          >
            <Ionicons name="time-outline" size={16} color={colors.accent} />
            <Text
              style={{
                color: colors.accent,
                fontSize: typography.body.fontSize,
                marginLeft: spacing.sm,
              }}
            >
              {humanPreview}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {},
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  presetChip: { width: '48%' },
  cronInput: { borderWidth: 1 },
  preview: { flexDirection: 'row', alignItems: 'center' },
});

