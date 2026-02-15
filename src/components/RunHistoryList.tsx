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

function formatFullTimestamp(ts: string | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const DetailRow: React.FC<{
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  typography: ReturnType<typeof useTheme>['typography'];
}> = ({ label, value, colors, spacing, typography }) => (
  <View style={[styles.detailRow, { paddingVertical: spacing.xs + 2 }]}>
    <Text style={{ color: colors.textMuted, fontSize: typography.small.fontSize }}>
      {label}
    </Text>
    <Text
      style={{
        color: colors.textSecondary,
        fontSize: typography.small.fontSize,
        fontFamily: monoFont,
        flexShrink: 1,
        textAlign: 'right',
      }}
      selectable
    >
      {value}
    </Text>
  </View>
);

function statusLabel(status: string): string {
  switch (status) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Error';
    case 'running':
      return 'Running';
    default:
      return status;
  }
}

const RunEntry: React.FC<{ run: CronRunRecord }> = ({ run }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.entry, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => [
          styles.entryHeader,
          {
            paddingVertical: spacing.md,
            backgroundColor: pressed ? colors.surface : 'transparent',
          },
        ]}
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
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
            style={{ marginLeft: spacing.sm }}
          />
        </View>
      </Pressable>

      {expanded && (
        <View
          style={[
            styles.detailsContainer,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.sm,
              marginBottom: spacing.md,
              padding: spacing.sm,
            },
          ]}
        >
          <DetailRow
            label="Status"
            value={statusLabel(run.status)}
            colors={colors}
            spacing={spacing}
            typography={typography}
          />
          <DetailRow
            label="Started"
            value={formatFullTimestamp(run.startedAt)}
            colors={colors}
            spacing={spacing}
            typography={typography}
          />
          <DetailRow
            label="Completed"
            value={formatFullTimestamp(run.completedAt)}
            colors={colors}
            spacing={spacing}
            typography={typography}
          />
          <DetailRow
            label="Duration"
            value={formatDuration(run.duration)}
            colors={colors}
            spacing={spacing}
            typography={typography}
          />

          {run.error && (
            <View
              style={[
                styles.errorBlock,
                {
                  backgroundColor: colors.error + '14',
                  borderColor: colors.error + '33',
                  borderRadius: radius.sm,
                  marginTop: spacing.sm,
                  padding: spacing.sm,
                },
              ]}
            >
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text
                  style={{
                    fontFamily: monoFont,
                    fontSize: 12,
                    lineHeight: 18,
                    color: colors.error,
                    marginLeft: 6,
                    flex: 1,
                  }}
                  selectable
                >
                  {run.error}
                </Text>
              </View>
            </View>
          )}

          {run.output && (
            <View style={{ marginTop: spacing.sm }}>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.small.fontSize,
                  marginBottom: spacing.xs,
                }}
              >
                Output
              </Text>
              <ScrollView
                style={[
                  styles.logBlock,
                  {
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: radius.sm,
                    maxHeight: 200,
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
                  selectable
                >
                  {run.output}
                </Text>
              </ScrollView>
            </View>
          )}

          {!run.output && !run.error && run.status === 'success' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: spacing.sm,
                paddingTop: spacing.xs,
              }}
            >
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.small.fontSize,
                  marginLeft: spacing.xs,
                }}
              >
                Completed successfully — no output recorded
              </Text>
            </View>
          )}
        </View>
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
  detailsContainer: {},
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logBlock: {},
  errorBlock: { borderWidth: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start' },
  emptyWrap: { alignItems: 'center', paddingVertical: 32 },
});

