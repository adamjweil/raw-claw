import { useState, useCallback, useEffect } from 'react';
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
import { useTheme } from '../../src/theme';
import { useStore } from '../../src/services/store';
import { useCronJobs } from '../../src/hooks';
import { useCronRunHistory } from '../../src/hooks/useCronRunHistory';
import { Row, Badge, AnimatedCard, SkeletonCard, ErrorState } from '../../src/components';
import { RunHistoryList } from '../../src/components/RunHistoryList';
import { CronJob } from '../../src/types';

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

  const job = cronJobs.data?.find((j) => j.id === id) || null;

  const handleToggle = useCallback(async () => {
    if (!state.client || !job) return;
    try {
      await state.client.toggleCronJob(job.id, !job.enabled);
      cronJobs.refresh();
    } catch {
      Alert.alert('Error', 'Failed to toggle automation.');
    }
  }, [state.client, job, cronJobs]);

  const handleRunNow = useCallback(async () => {
    if (!state.client || !job) return;
    setRunningNow(true);
    try {
      await state.client.runCronJob(job.id);
      cronJobs.refresh();
      runHistory.refresh();
    } catch {
      Alert.alert('Error', 'Failed to run automation.');
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

  const handleEdit = useCallback(() => {
    if (!job) return;
    router.push(`/automations/create?editId=${job.id}` as never);
  }, [router, job]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cronJobs.refresh();
    runHistory.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }, [cronJobs, runHistory]);

  if (cronJobs.loading && !cronJobs.data) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={{ padding: spacing.lg }}>
          <SkeletonCard lines={5} />
        </View>
      </SafeAreaView>
    );
  }

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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: spacing.lg, paddingBottom: 40 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={handleEdit} style={[styles.headerAction, { marginRight: spacing.sm }]}>
            <Ionicons name="create-outline" size={22} color={colors.accent} />
          </Pressable>
          <Pressable onPress={handleDelete} disabled={deleting}>
            {deleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            )}
          </Pressable>
        </View>

        {/* Title & Run Now */}
        <View style={[styles.titleRow, { marginTop: spacing.md }]}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 24,
                fontWeight: '700',
              }}
            >
              {job.name}
            </Text>
            <View style={[styles.enabledRow, { marginTop: spacing.sm }]}>
              <Switch
                value={job.enabled}
                onValueChange={handleToggle}
                trackColor={{ true: colors.accent + '44', false: '#333' }}
                thumbColor={job.enabled ? colors.accent : '#666'}
              />
              <Text
                style={{
                  color: job.enabled ? colors.success : colors.textMuted,
                  fontSize: typography.body.fontSize,
                  marginLeft: spacing.sm,
                  fontWeight: '500',
                }}
              >
                {job.enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
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

        {/* Details Card */}
        <AnimatedCard title="Details" icon="information-circle" delay={0}>
          <Row label="Schedule" value={job.scheduleHuman} />
          <Row label="Cron Expression" value={job.schedule} />
          <Row
            label="Last Run"
            value={job.lastRun ? new Date(job.lastRun).toLocaleString() : '—'}
          />
          <View
            style={[
              styles.statusRow,
              { paddingVertical: spacing.sm, borderBottomColor: colors.border },
            ]}
          >
            <Text style={{ color: colors.textMuted, fontSize: typography.label.fontSize }}>
              Status
            </Text>
            <Badge status={job.lastStatus} />
          </View>
          <Row
            label="Next Run"
            value={job.nextRun ? new Date(job.nextRun).toLocaleString() : '—'}
          />
        </AnimatedCard>

        {/* Run History */}
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

        {/* Delete button */}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
  },
  headerAction: {},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

