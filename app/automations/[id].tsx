import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Markdown from '@ronradtke/react-native-markdown-display';
import { useTheme } from '../../src/theme';
import { useStore } from '../../src/services/store';
import { useCronJobs } from '../../src/hooks';
import { useCronRunHistory } from '../../src/hooks/useCronRunHistory';
import { AnimatedCard, SkeletonCard, ErrorState } from '../../src/components';
import { RunHistoryList } from '../../src/components/RunHistoryList';
import { CronJob, CronRunRecord } from '../../src/types';
import { appendRunRecord } from '../../src/services/runHistoryStore';
import { getMarkdownStyles } from '../../src/theme/markdownStyles';

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return 'None';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusEmoji(status: CronJob['lastStatus']): string {
  switch (status) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Error';
    case 'pending':
      return 'Pending';
    default:
      return 'None';
  }
}

/**
 * Build a markdown document from CronJob data.
 * Sections are only included when the relevant data exists.
 */
function buildAutomationMarkdown(job: CronJob): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${job.name}`);

  // Status line
  sections.push(`**Status:** ${job.enabled ? 'Enabled' : 'Disabled'}`);

  // ── What It Does ──
  if (job.input || job.description) {
    sections.push('---');
    sections.push('## What It Does');
    if (job.description) {
      sections.push(job.description);
    }
    if (job.input) {
      sections.push(`> ${job.input}`);
    }
  }

  // ── Schedule ──
  sections.push('---');
  sections.push('## Schedule');
  sections.push(`- **Frequency:** ${job.scheduleHuman}`);
  sections.push(`- **Cron Expression:** \`${job.schedule}\``);
  if (job.nextRun) {
    sections.push(`- **Next Run:** ${formatDate(job.nextRun)}`);
  }

  // ── Recent Activity ──
  sections.push('---');
  sections.push('## Recent Activity');
  sections.push(`- **Last Run:** ${formatDate(job.lastRun)}`);
  sections.push(`- **Last Status:** ${statusEmoji(job.lastStatus)}`);
  if (job.lastError) {
    sections.push('');
    sections.push('**Last Error:**');
    sections.push('```');
    sections.push(job.lastError);
    sections.push('```');
  }

  return sections.join('\n\n');
}

// ─── Component ───────────────────────────────────────────────────────

export default function AutomationDetail() {
  const { colors, spacing, radius, typography } = useTheme();
  const { state } = useStore();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const cronJobs = useCronJobs();
  const runHistory = useCronRunHistory(id || '');

  const [runningNow, setRunningNow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [optimisticEnabled, setOptimisticEnabled] = useState<boolean | null>(null);
  const [extrasExpanded, setExtrasExpanded] = useState(false);

  const job = cronJobs.data?.find((j) => j.id === id) || null;

  // Use optimistic value when available, otherwise use server value
  const isEnabled = optimisticEnabled !== null ? optimisticEnabled : (job?.enabled ?? false);

  // Clear optimistic state when server data catches up
  useEffect(() => {
    if (optimisticEnabled !== null && job && job.enabled === optimisticEnabled) {
      setOptimisticEnabled(null);
    }
  }, [job?.enabled, optimisticEnabled]);

  const mdStyles = useMemo(() => getMarkdownStyles(colors, typography), [colors, typography]);

  const markdownContent = useMemo(() => {
    if (!job) return '';
    return buildAutomationMarkdown({ ...job, enabled: isEnabled });
  }, [job, isEnabled]);

  const extrasMarkdown = useMemo(() => {
    if (!job?.rawExtras || Object.keys(job.rawExtras).length === 0) return null;
    const lines: string[] = [];
    for (const [key, value] of Object.entries(job.rawExtras)) {
      if (value == null) continue;
      const display =
        typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      if (display.includes('\n')) {
        lines.push(`**${key}:**`);
        lines.push('```');
        lines.push(display);
        lines.push('```');
      } else {
        lines.push(`- **${key}:** ${display}`);
      }
    }
    return lines.join('\n\n');
  }, [job?.rawExtras]);

  const handleToggle = useCallback(async () => {
    if (!state.client || !job) return;
    const newEnabled = !isEnabled;
    setOptimisticEnabled(newEnabled);
    try {
      await state.client.toggleCronJob(job.id, newEnabled);
      cronJobs.refresh();
    } catch (e: unknown) {
      setOptimisticEnabled(null);
      const detail = e instanceof Error ? e.message : String(e);
      Alert.alert('Failed to Toggle', detail);
    }
  }, [state.client, job, isEnabled, cronJobs]);

  const handleRunNow = useCallback(async () => {
    if (!state.client || !job) return;
    setRunningNow(true);
    const startedAt = new Date().toISOString();
    try {
      await state.client.runCronJob(job.id);
      const completedAt = new Date().toISOString();
      const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();

      const record: CronRunRecord = {
        id: `run-${job.id}-${Date.now()}`,
        startedAt,
        completedAt,
        status: 'success',
        duration,
      };
      await appendRunRecord(job.id, record);

      cronJobs.refresh();
      runHistory.refresh();
      Alert.alert('Run Completed', `"${job.name}" ran successfully.`);
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : String(e);
      const isTimeout = detail.toLowerCase().includes('timeout');

      const record: CronRunRecord = {
        id: `run-${job.id}-${Date.now()}`,
        startedAt,
        completedAt: new Date().toISOString(),
        status: isTimeout ? 'running' : 'error',
        error: detail,
        duration: Date.now() - new Date(startedAt).getTime(),
      };
      await appendRunRecord(job.id, record);

      cronJobs.refresh();
      runHistory.refresh();

      if (isTimeout) {
        Alert.alert(
          'Run May Still Be In Progress',
          'The automation was triggered but took longer than expected to respond. Pull down to refresh and check the latest status.',
        );
      } else {
        Alert.alert('Run Failed', detail);
      }
    } finally {
      setRunningNow(false);
    }
  }, [state.client, job, cronJobs, runHistory]);

  const handleDelete = useCallback(async () => {
    if (!state.client || !job) return;
    Alert.alert(
      'Delete Automation',
      `Are you sure you want to delete "${job.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await state.client!.deleteCronJob(job.id);
              cronJobs.refresh();
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to delete automation.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [state.client, job, cronJobs, router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cronJobs.refresh();
    runHistory.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }, [cronJobs, runHistory]);

  // ─── Loading ───────────────────────────────────────────────────────

  if (cronJobs.loading && !cronJobs.data) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={{ padding: spacing.lg }}>
          <SkeletonCard lines={5} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Not Found ─────────────────────────────────────────────────────

  if (!job) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={{ padding: spacing.lg }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <ErrorState message="Automation not found" onRetry={cronJobs.refresh} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main View ─────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      {/* Header bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
          <Text
            style={{ color: colors.accent, fontSize: typography.body.fontSize, marginLeft: 4 }}
          >
            Automations
          </Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={handleDelete} disabled={deleting} hitSlop={8}>
            {deleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Action controls */}
        <View
          style={[
            styles.controlsRow,
            {
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.sm,
            },
          ]}
        >
          <View style={styles.enabledRow}>
            <Switch
              value={isEnabled}
              onValueChange={handleToggle}
              trackColor={{ true: colors.accent + '44', false: '#333' }}
              thumbColor={isEnabled ? colors.accent : '#666'}
            />
            <Text
              style={{
                color: isEnabled ? colors.success : colors.textMuted,
                fontSize: typography.body.fontSize,
                marginLeft: spacing.sm,
                fontWeight: '500',
              }}
            >
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Pressable
            style={[
              styles.runNowBtn,
              {
                backgroundColor: colors.accent,
                borderRadius: radius.md,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm + 2,
              },
            ]}
            onPress={handleRunNow}
            disabled={runningNow}
          >
            {runningNow ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 6 }}>
                  Run Now
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Markdown document */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Markdown style={mdStyles}>{markdownContent}</Markdown>
        </View>

        {/* Collapsible Additional Details */}
        {extrasMarkdown && (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
            <View
              style={[
                styles.extrasDivider,
                { borderBottomColor: colors.border, marginBottom: spacing.sm },
              ]}
            />
            <Pressable
              onPress={() => setExtrasExpanded((prev) => !prev)}
              style={styles.extrasHeader}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 19,
                  fontWeight: '700',
                }}
              >
                Additional Details
              </Text>
              <Ionicons
                name={extrasExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
            {extrasExpanded && (
              <View style={{ marginTop: spacing.sm }}>
                <Markdown style={mdStyles}>{extrasMarkdown}</Markdown>
              </View>
            )}
          </View>
        )}

        {/* Run History — kept as native component for expandable rows */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
          <AnimatedCard title="Run History" icon="time" delay={80}>
            {runHistory.loading && !runHistory.data ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : runHistory.error ? (
              <View style={{ paddingVertical: 12 }}>
                <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                  {runHistory.error}
                </Text>
                <Pressable onPress={runHistory.refresh} style={{ marginTop: 8 }}>
                  <Text
                    style={{ color: colors.accent, textAlign: 'center', fontWeight: '600' }}
                  >
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : (
              <RunHistoryList runs={runHistory.data || []} />
            )}
          </AnimatedCard>
        </View>

        {/* Delete button */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Pressable
            onPress={handleDelete}
            disabled={deleting}
            style={[
              styles.deleteBtn,
              {
                borderColor: colors.error + '44',
                borderRadius: radius.md,
                paddingVertical: spacing.md,
                marginTop: spacing.xl,
              },
            ]}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text
                  style={{
                    color: colors.error,
                    fontWeight: '600',
                    marginLeft: spacing.sm,
                  }}
                >
                  Delete Automation
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enabledRow: { flexDirection: 'row', alignItems: 'center' },
  runNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  extrasDivider: {
    borderBottomWidth: 1,
  },
  extrasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
