import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, monoFont } from '../theme';
import { Badge } from './Badge';
import { CronRunRecord } from '../types';

interface RunHistoryListProps {
  runs: CronRunRecord[];
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms?: number): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

const RunEntry: React.FC<{ run: CronRunRecord }> = ({ run }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.entry, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={[styles.entryHeader, { paddingVertical: spacing.md }]}
      >
        <View style={styles.entryLeft}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.body.fontSize,
            }}
          >
            {formatTimestamp(run.startedAt)}
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.small.fontSize,
              marginLeft: spacing.md,
            }}
          >
            {formatDuration(run.duration)}
          </Text>
        </View>
        <View style={styles.entryRight}>
          <Badge status={run.status} />
          {run.output && (
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textMuted}
              style={{ marginLeft: spacing.sm }}
            />
          )}
        </View>
      </Pressable>

      {expanded && run.output && (
        <ScrollView
          style={[
            styles.logBlock,
            {
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: radius.sm,
              maxHeight: 200,
              marginBottom: spacing.md,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: monoFont,
              fontSize: 12,
              lineHeight: 18,
              color: colors.textSecondary,
              padding: spacing.sm,
            }}
          >
            {run.output}
          </Text>
        </ScrollView>
      )}
    </View>
  );
};

export const RunHistoryList: React.FC<RunHistoryListProps> = ({ runs }) => {
  const { colors, typography, spacing } = useTheme();

  if (runs.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="time-outline" size={36} color={colors.textMuted + '66'} />
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.body.fontSize,
            marginTop: spacing.sm,
          }}
        >
          No run history yet
        </Text>
      </View>
    );
  }

  return (
    <View>
      {runs.map((run) => (
        <RunEntry key={run.id} run={run} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  entry: { borderBottomWidth: 1 },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  entryRight: { flexDirection: 'row', alignItems: 'center' },
  logBlock: {},
  emptyWrap: { alignItems: 'center', paddingVertical: 32 },
});

