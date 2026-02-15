import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../src/services/store';
import { useTheme } from '../../src/theme';
import { AnimatedCard, ScreenHeader, StatusPill, Row, SkeletonCard, EmptyState } from '../../src/components';
import { useGatewayStatus, useActivityFeed, useCronJobs, useTokenUsage, useNotifications } from '../../src/hooks';
import { ActivityEvent, CronJob } from '../../src/types';

// ─── Helpers ─────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  chat: 'chatbubble',
  cron: 'timer',
  channel: 'radio',
  system: 'settings',
};

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatNextRun(jobs: CronJob[]): string {
  const enabled = jobs.filter((j) => j.enabled && j.nextRun);
  if (enabled.length === 0) return 'No upcoming runs';
  const sorted = enabled.sort(
    (a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime()
  );
  const next = new Date(sorted[0].nextRun!).getTime();
  const diff = next - Date.now();
  if (diff <= 0) return 'Running now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `in ${hours}h ${mins % 60}m`;
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Activity Item ───────────────────────────────────────────────────

interface ActivityItemProps {
  event: ActivityEvent;
}

function ActivityItem({ event }: ActivityItemProps) {
  const { colors, spacing } = useTheme();
  const iconName = (event.icon as keyof typeof Ionicons.glyphMap) || CATEGORY_ICONS[event.category] || 'ellipse';

  return (
    <View
      style={[
        styles.activityRow,
        { paddingVertical: spacing.sm, borderBottomColor: colors.border },
      ]}
    >
      <Ionicons name={iconName} size={14} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
      <Text style={[styles.activityText, { color: colors.textSecondary }]} numberOfLines={1}>
        {event.text}
      </Text>
      <Text style={[styles.activityTime, { color: colors.textMuted, marginLeft: spacing.sm }]}>
        {relativeTime(event.timestamp)}
      </Text>
    </View>
  );
}

// ─── Token Usage Bar ─────────────────────────────────────────────────

function TokenBar({ current, limit }: { current: number; limit?: number }) {
  const { colors, radius } = useTheme();
  const percentage = limit ? Math.min((current / limit) * 100, 100) : 0;

  if (!limit) return null;

  return (
    <View style={[styles.barBg, { backgroundColor: colors.surface, borderRadius: radius.sm }]}>
      <View
        style={[
          styles.barFill,
          {
            backgroundColor: percentage > 80 ? colors.warning : colors.accent,
            borderRadius: radius.sm,
            width: `${percentage}%` as unknown as number,
          },
        ]}
      />
    </View>
  );
}

// ─── Quick Action Button ─────────────────────────────────────────────

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  loading?: boolean;
}

function QuickAction({ icon, label, onPress, loading }: QuickActionProps) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <Pressable
      style={[
        styles.actionBtn,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.md - 2,
        },
      ]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Ionicons name={icon} size={20} color="#fff" />
      )}
      <Text
        style={[styles.actionLabel, { color: colors.textSecondary, fontSize: typography.caption.fontSize }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Notification Summary Card (Real) ─────────────────────────────────

function NotificationSummary() {
  const { colors, spacing } = useTheme();
  const { unreadByCategory } = useNotifications();

  const categories = [
    { name: 'Arb Alerts', key: 'arb_alert', icon: 'trending-up' as const },
    { name: 'Cron Results', key: 'cron_result', icon: 'timer' as const },
    { name: 'Reminders', key: 'reminder', icon: 'notifications' as const },
  ];

  const totalUnread = categories.reduce((sum, cat) => sum + (unreadByCategory[cat.key] || 0), 0);

  return (
    <>
      {categories.map((cat) => {
        const count = unreadByCategory[cat.key] || 0;
        return (
          <View
            key={cat.name}
            style={[styles.notifRow, { paddingVertical: spacing.sm, borderBottomColor: colors.border }]}
            accessibilityLabel={`${cat.name}: ${count} unread`}
          >
            <Ionicons name={cat.icon} size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
            <Text style={[styles.notifName, { color: colors.textSecondary }]}>{cat.name}</Text>
            <Text style={[styles.notifCount, { color: count > 0 ? colors.accent : colors.textMuted }]}>
              {count}
            </Text>
          </View>
        );
      })}
      {totalUnread === 0 && (
        <Text style={[styles.noNotifs, { color: colors.textMuted, marginTop: spacing.sm }]}>
          No new notifications
        </Text>
      )}
    </>
  );
}

// ─── Offline Banner ──────────────────────────────────────────────────

function OfflineBanner() {
  const { colors, spacing } = useTheme();
  const { state } = useStore();

  if (state.connected) return null;

  return (
    <View
      style={[
        styles.offlineBanner,
        {
          backgroundColor: colors.error + '22',
          borderColor: colors.error + '44',
          padding: spacing.sm,
          marginBottom: spacing.md,
          borderRadius: 8,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel="You are offline"
    >
      <Ionicons name="cloud-offline" size={16} color={colors.error} />
      <Text style={[styles.offlineText, { color: colors.error, marginLeft: spacing.sm }]}>
        Offline — showing cached data
      </Text>
    </View>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────

export default function Home() {
  const { state, dispatch } = useStore();
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Live data hooks
  const gatewayStatus = useGatewayStatus();
  const activityFeed = useActivityFeed();
  const cronJobs = useCronJobs();
  const tokenUsage = useTokenUsage();

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await Promise.all([
      gatewayStatus.refresh(),
      activityFeed.refresh(),
      cronJobs.refresh(),
      tokenUsage.refresh(),
    ]);
    setRefreshing(false);
  }, [gatewayStatus, activityFeed, cronJobs, tokenUsage]);

  // Derive status pill state
  const pillState = useMemo(() => {
    if (state.thinking) return 'thinking' as const;
    if (state.connected) return 'online' as const;
    return 'offline' as const;
  }, [state.thinking, state.connected]);

  // Model name from live status or store
  const modelName = gatewayStatus.data?.model || state.status?.model || '';

  // Status pill label
  const pillLabel = useMemo(() => {
    if (pillState === 'online' && modelName) return `${modelName} · Online`;
    return undefined; // use default from StatusPill
  }, [pillState, modelName]);

  // Quick action handlers
  const [actionLoading, setActionLoading] = useQuickActionState();

  const handleQuickAction = useCallback(
    async (action: string) => {
      if (!state.client) {
        router.push('/settings');
        return;
      }

      setActionLoading(action, true);
      try {
        switch (action) {
          case 'email':
            dispatch({ type: 'SET_THINKING', thinking: true });
            await state.client.sendMessage('Check my email');
            dispatch({ type: 'SET_THINKING', thinking: false });
            router.push('/(tabs)/chat');
            break;
          case 'weather':
            dispatch({ type: 'SET_THINKING', thinking: true });
            await state.client.sendMessage("What's the weather?");
            dispatch({ type: 'SET_THINKING', thinking: false });
            router.push('/(tabs)/chat');
            break;
          case 'crons':
            router.push('/(tabs)/automations');
            break;
          case 'status':
            router.push('/(tabs)/status');
            break;
        }
      } catch {
        dispatch({ type: 'SET_THINKING', thinking: false });
      } finally {
        setActionLoading(action, false);
      }
    },
    [state.client, dispatch, router, setActionLoading]
  );

  // Active automation count
  const enabledJobs = cronJobs.data?.filter((j) => j.enabled).length ?? 0;
  const nextRunText = cronJobs.data ? formatNextRun(cronJobs.data) : '—';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: spacing.lg, paddingBottom: 40 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Offline banner */}
        <OfflineBanner />

        {/* Header */}
        <ScreenHeader
          title="Paw 🐾"
          rightElement={
            <StatusPill
              state={pillState}
              label={pillLabel}
              onPress={() => router.push('/settings')}
            />
          }
        />

        {/* Gateway Status Card */}
        {gatewayStatus.loading && !gatewayStatus.data ? (
          <SkeletonCard lines={3} />
        ) : (
          <AnimatedCard title="Gateway Status" icon="server" delay={0}>
            <Row
              label="Model"
              value={gatewayStatus.data?.model || state.status?.model || '—'}
            />
            <Row label="Uptime" value={gatewayStatus.data?.uptime || state.status?.uptime || '—'} />
            <Row
              label="Session"
              value={
                (gatewayStatus.data?.sessionId || state.status?.sessionId || '').slice(0, 12) +
                (gatewayStatus.data?.sessionId || state.status?.sessionId ? '…' : '—')
              }
            />
          </AnimatedCard>
        )}

        {/* Quick Actions */}
        <AnimatedCard title="Quick Actions" icon="flash" delay={80}>
          <View style={styles.actions}>
            <QuickAction
              icon="mail"
              label="Check Email"
              onPress={() => handleQuickAction('email')}
              loading={actionLoading.email}
            />
            <QuickAction
              icon="cloud"
              label="Weather"
              onPress={() => handleQuickAction('weather')}
              loading={actionLoading.weather}
            />
            <QuickAction
              icon="timer"
              label="Run Crons"
              onPress={() => handleQuickAction('crons')}
              loading={actionLoading.crons}
            />
            <QuickAction
              icon="pulse"
              label="Status"
              onPress={() => handleQuickAction('status')}
              loading={actionLoading.status}
            />
          </View>
        </AnimatedCard>

        {/* Recent Activity */}
        {activityFeed.loading && !activityFeed.data ? (
          <SkeletonCard lines={5} />
        ) : (
          <AnimatedCard title="Recent Activity" icon="time" delay={160}>
            {activityFeed.data && activityFeed.data.length > 0 ? (
              activityFeed.data.slice(0, 8).map((event) => (
                <ActivityItem key={event.id} event={event} />
              ))
            ) : (
              <EmptyState icon="time-outline" message="No recent activity" />
            )}
          </AnimatedCard>
        )}

        {/* Active Automations */}
        {cronJobs.loading && !cronJobs.data ? (
          <SkeletonCard lines={2} />
        ) : (
          <AnimatedCard title="Active Automations" icon="repeat" delay={240}>
            <Row
              label="Running"
              value={String(enabledJobs)}
              valueColor={colors.accent}
            />
            <Row label="Next run" value={nextRunText} />
          </AnimatedCard>
        )}

        {/* Token Usage */}
        {tokenUsage.loading && !tokenUsage.data ? (
          <SkeletonCard lines={3} />
        ) : tokenUsage.data ? (
          <AnimatedCard title="Token Usage" icon="analytics" delay={320}>
            <Row label="Today" value={formatTokenCount(tokenUsage.data.today)} />
            <Row label="Total" value={formatTokenCount(tokenUsage.data.total)} />
            {tokenUsage.data.limit && (
              <>
                <Row
                  label="Limit"
                  value={formatTokenCount(tokenUsage.data.limit)}
                />
                <TokenBar current={tokenUsage.data.today} limit={tokenUsage.data.limit} />
              </>
            )}
            {tokenUsage.data.estimatedCost !== undefined && (
              <Row
                label="Est. Cost"
                value={`$${tokenUsage.data.estimatedCost.toFixed(2)}`}
                valueColor={colors.warning}
              />
            )}
          </AnimatedCard>
        ) : (
          <AnimatedCard title="Token Usage" icon="analytics" delay={320}>
            <EmptyState icon="analytics-outline" message="Usage data unavailable" />
          </AnimatedCard>
        )}

        {/* Notification Summary */}
        <AnimatedCard title="Notifications" icon="notifications" delay={400}>
          <NotificationSummary />
        </AnimatedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Quick Action Loading State Hook ─────────────────────────────────

function useQuickActionState() {
  const [loading, setLoadingState] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((action: string, isLoading: boolean) => {
    setLoadingState((prev) => ({ ...prev, [action]: isLoading }));
  }, []);

  return [loading, setLoading] as const;
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {},
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: {
    alignItems: 'center',
    width: '47%' as unknown as number,
    gap: 6,
  },
  actionLabel: { fontWeight: '600' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  activityText: { fontSize: 13, flex: 1 },
  activityTime: { fontSize: 12 },
  barBg: { height: 6, width: '100%', marginTop: 8 },
  barFill: { height: 6 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  notifName: { flex: 1, fontSize: 14 },
  notifCount: { fontSize: 14, fontWeight: '700' },
  noNotifs: { fontSize: 13, textAlign: 'center' },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  offlineText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
