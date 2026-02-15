import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme';
import { useStore } from '../../src/services/store';
import {
  ScreenHeader,
  Badge,
  SkeletonCard,
  EmptyState,
  ErrorState,
  AnimatedCard,
} from '../../src/components';
import { useCronJobs } from '../../src/hooks';
import { CronJob } from '../../src/types';

export default function Automations() {
  const { colors, spacing, radius, typography } = useTheme();
  const { state } = useStore();
  const router = useRouter();
  const liveJobs = useCronJobs();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [optimisticToggles, setOptimisticToggles] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  const jobs = liveJobs.data || [];

  const toggle = useCallback(
    async (id: string, currentEnabled: boolean) => {
      if (!state.client) return;
      // Optimistic update
      setOptimisticToggles((prev) => ({ ...prev, [id]: !currentEnabled }));
      try {
        await state.client.toggleCronJob(id, !currentEnabled);
        liveJobs.refresh();
      } catch {
        // Revert on failure
        setOptimisticToggles((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        Alert.alert('Error', 'Failed to toggle automation. Please try again.');
      }
    },
    [state.client, liveJobs]
  );

  const runNow = useCallback(
    async (id: string) => {
      if (!state.client) return;
      setRunningId(id);
      try {
        await state.client.runCronJob(id);
        liveJobs.refresh();
      } catch {
        Alert.alert('Error', 'Failed to run automation.');
      } finally {
        setRunningId(null);
      }
    },
    [state.client, liveJobs]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    liveJobs.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }, [liveJobs]);

  const getEnabled = (job: CronJob) =>
    optimisticToggles[job.id] !== undefined ? optimisticToggles[job.id] : job.enabled;

  const enabledCount = jobs.filter((j) => getEnabled(j)).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: spacing.lg, paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <ScreenHeader title="Automations" />
        <Text style={[styles.subtitle, { color: colors.textMuted, marginBottom: spacing.lg }]}>
          {enabledCount} active
        </Text>

        {liveJobs.loading && !liveJobs.data ? (
          <>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </>
        ) : liveJobs.error && !liveJobs.data ? (
          <ErrorState message={liveJobs.error} onRetry={liveJobs.refresh} />
        ) : jobs.length === 0 ? (
          <EmptyState icon="timer-outline" message="No automations configured" />
        ) : (
          jobs.map((job, i) => {
            const enabled = getEnabled(job);
            return (
              <AnimatedCard key={job.id} delay={i * 60}>
                <Pressable
                  onPress={() =>
                    router.push(`/automations/${job.id}` as never)
                  }
                >
                  <View style={styles.cardTop}>
                    <Text
                      style={[
                        styles.jobName,
                        {
                          color: colors.text,
                          fontSize: typography.heading.fontSize,
                          fontWeight: typography.heading.fontWeight,
                        },
                      ]}
                    >
                      {job.name}
                    </Text>
                    <Switch
                      value={enabled}
                      onValueChange={() => toggle(job.id, job.enabled)}
                      trackColor={{ true: colors.accent + '44', false: '#333' }}
                      thumbColor={enabled ? colors.accent : '#666'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.schedule,
                      { color: colors.textMuted, marginTop: spacing.xs + 2 },
                    ]}
                  >
                    {job.scheduleHuman}
                  </Text>
                  <View style={[styles.cardBottom, { marginTop: spacing.md - 2 }]}>
                    <Badge status={job.lastStatus} />
                    <Pressable
                      style={styles.runBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        runNow(job.id);
                      }}
                      disabled={runningId === job.id}
                    >
                      {runningId === job.id ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <>
                          <Ionicons name="play" size={14} color={colors.accent} />
                          <Text style={[styles.runText, { color: colors.accent }]}>
                            Run Now
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </Pressable>
              </AnimatedCard>
            );
          })
        )}
      </ScrollView>

      {/* FAB for creating new automation */}
      <Pressable
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent,
            borderRadius: 28,
            bottom: 24,
            right: spacing.lg,
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          router.push('/automations/create' as never);
        }}
        accessibilityRole="button"
        accessibilityLabel="Create new automation"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {},
  subtitle: { fontSize: 14, marginTop: -16 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobName: {},
  schedule: { fontSize: 13 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  runText: { fontSize: 13, fontWeight: '600' },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
