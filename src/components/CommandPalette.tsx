import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export interface SlashCommand {
  command: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const DEFAULT_COMMANDS: SlashCommand[] = [
  { command: '/status', label: 'Status', description: 'Show AI status', icon: 'pulse' },
  { command: '/weather', label: 'Weather', description: 'Get weather report', icon: 'cloudy' },
  { command: '/email', label: 'Email', description: 'Check email', icon: 'mail' },
  { command: '/cron', label: 'Cron', description: 'List automations', icon: 'timer' },
  { command: '/skills', label: 'Skills', description: 'List skills', icon: 'extension-puzzle' },
  { command: '/clear', label: 'Clear', description: 'Clear current session', icon: 'trash-outline' },
  { command: '/help', label: 'Help', description: 'Show available commands', icon: 'help-circle' },
];

interface CommandPaletteProps {
  filter: string; // the text typed after "/"
  commands?: SlashCommand[];
  onSelect: (command: SlashCommand) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  filter,
  commands = DEFAULT_COMMANDS,
  onSelect,
}) => {
  const { colors, spacing, radius, typography } = useTheme();

  const filtered = useMemo(() => {
    const f = filter.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.command.toLowerCase().includes(f) ||
        cmd.label.toLowerCase().includes(f)
    );
  }, [filter, commands]);

  if (filtered.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderRadius: radius.lg,
          marginHorizontal: spacing.md,
          marginBottom: spacing.sm,
          maxHeight: 260,
        },
      ]}
    >
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.command}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: pressed ? colors.card : 'transparent',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 2,
              },
            ]}
          >
            <Ionicons name={item.icon} size={18} color={colors.accent} />
            <View style={[styles.itemText, { marginLeft: spacing.md }]}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: typography.body.fontSize,
                  fontWeight: '600',
                }}
              >
                {item.command}
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.small.fontSize,
                }}
              >
                {item.description}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: { flex: 1 },
});

