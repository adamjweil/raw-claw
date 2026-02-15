import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, monoFont } from '../theme';
import { MemoryDiff } from '../types';

interface DiffViewerProps {
  diffs: MemoryDiff[];
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface DiffEntryProps {
  diff: MemoryDiff;
}

const DiffEntry: React.FC<DiffEntryProps> = ({ diff }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const lines = diff.patch.split('\n');

  return (
    <View style={[styles.entry, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={[styles.entryHeader, { paddingVertical: spacing.md }]}
      >
        <View style={styles.entryMeta}>
          <Ionicons
            name="git-commit-outline"
            size={16}
            color={colors.accent}
          />
          <View style={{ marginLeft: spacing.sm }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.body.fontSize,
                fontWeight: '500',
              }}
            >
              {diff.author}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.small.fontSize,
              }}
            >
              {formatRelativeTime(diff.timestamp)}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      {expanded && (
        <ScrollView
          horizontal
          style={[
            styles.diffBlock,
            {
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: radius.sm,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={{ padding: spacing.sm }}>
            {lines.map((line, i) => {
              let lineColor = colors.textMuted;
              let lineBg = 'transparent';

              if (line.startsWith('+') && !line.startsWith('+++')) {
                lineColor = colors.success;
                lineBg = 'rgba(16, 185, 129, 0.1)';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                lineColor = colors.error;
                lineBg = 'rgba(239, 68, 68, 0.1)';
              } else if (line.startsWith('@@')) {
                lineColor = colors.accent;
              }

              return (
                <View key={i} style={{ backgroundColor: lineBg, paddingHorizontal: 4 }}>
                  <Text
                    style={{
                      fontFamily: monoFont,
                      fontSize: 12,
                      lineHeight: 18,
                      color: lineColor,
                    }}
                  >
                    {line}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffs }) => {
  const { colors, typography, spacing } = useTheme();

  if (diffs.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="time-outline" size={48} color={colors.textMuted + '66'} />
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.body.fontSize,
            marginTop: spacing.md,
          }}
        >
          No change history
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {diffs.map((diff, i) => (
        <DiffEntry key={`${diff.timestamp}-${i}`} diff={diff} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  entry: { borderBottomWidth: 1 },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryMeta: { flexDirection: 'row', alignItems: 'center' },
  diffBlock: { maxHeight: 300 },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
});

