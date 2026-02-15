import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, RefreshControl, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../src/services/store';
import { useTheme } from '../../src/theme';
import { AnimatedCard, ScreenHeader, StatusPill, Row, EmptyState, ModelPicker, SkeletonCard } from '../../src/components';
import { ActivityItem } from '../../src/components/ActivityItem';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { NotificationSummary } from '../../src/components/NotificationSummary';
import { UsageChart } from '../../src/components/UsageChart';
import { useGatewayStatus, useActivityFeed, useCronJobs, useTokenUsage, usePairedNodes, useIdentityName } from '../../src/hooks';
import { GatewayClient } from '../../src/services/gateway';
import { CronJob, ActivityEvent } from '../../src/types';
import { getContextWindowLabel } from '../../src/utils/modelContext';

// ─── Helpers ─────────────────────────────────────────────────────────

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
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function getLatencyColor(ms: number, colors: { success: string; warning: string; error: string }): string {
  if (ms < 100) return colors.success;
  if (ms <= 500) return colors.warning;
  return colors.error;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const DEVICE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  mac: 'desktop-outline',
  'mac mini': 'desktop-outline',
  macbook: 'laptop-outline',
  iphone: 'phone-portrait-outline',
  ipad: 'tablet-portrait-outline',
  'raspberry pi': 'hardware-chip-outline',
  linux: 'terminal-outline',
  windows: 'desktop-outline',
  server: 'server-outline',
};

function getDeviceIcon(type: string): keyof typeof Ionicons.glyphMap {
  const lower = type.toLowerCase();
  for (const [key, icon] of Object.entries(DEVICE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return 'hardware-chip-outline';
}

// ─── Home Screen ─────────────────────────────────────────────────────

export default function Home() {
  const { state, saveConfig } = useStore();
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Live data hooks
  const gatewayStatus = useGatewayStatus();
  const activityFeed = useActivityFeed();
  const cronJobs = useCronJobs();
  const tokenUsage = useTokenUsage();
  const pairedNodesHook = usePairedNodes();

  const connected = state.connected;

  // Identity name from IDENTITY.md memory file
  const identityName = useIdentityName();

  // Model picker state
  const [showModelPicker, setShowModelPicker] = useState(false);

  // Inline edit state for gateway connection
  const [editing, setEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(state.config.url);
  const [editToken, setEditToken] = useState(state.config.token);
  const [testing, setTesting] = useState(false);

  // Sync edit fields when config changes externally
  useEffect(() => {
    if (!editing) {
      setEditUrl(state.config.url);
      setEditToken(state.config.token);
    }
  }, [state.config, editing]);

  const handleCancelEdit = useCallback(() => {
    setEditUrl(state.config.url);
    setEditToken(state.config.token);
    setEditing(false);
  }, [state.config]);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    try {
      const client = new GatewayClient(editUrl, editToken);
      const ok = await client.testConnection();
      Alert.alert(
        ok ? 'Connected' : 'Failed',
        ok ? 'Gateway is reachable.' : 'Could not reach gateway.'
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Error', msg);
    } finally {
      setTesting(false);
    }
  }, [editUrl, editToken]);

  const handleSaveConfig = useCallback(async () => {
    await saveConfig({ url: editUrl, token: editToken });
    Alert.alert('Saved', 'Gateway configuration updated.');
    setEditing(false);
  }, [editUrl, editToken, saveConfig]);

  // Latency measurement
  const [latency, setLatency] = useState<number | null>(null);
  const [connUptime, setConnUptime] = useState<string>('—');
  const connectedSinceRef = useRef<number | null>(null);

  const measureLatency = useCallback(async () => {
    if (!state.client) {
      setLatency(null);
      return;
    }
    const start = performance.now();
    try {
      await state.client.getStatus();
      const ms = Math.round(performance.now() - start);
      setLatency(ms);
    } catch {
      setLatency(null);
    }
  }, [state.client]);

  // Track connection start time for uptime
  useEffect(() => {
    if (connected && !connectedSinceRef.current) {
      connectedSinceRef.current = Date.now();
    } else if (!connected) {
      connectedSinceRef.current = null;
      setConnUptime('—');
    }
  }, [connected]);

  // Auto-refresh latency and uptime every 10s
  useEffect(() => {
    measureLatency();
    const interval = setInterval(() => {
      measureLatency();
      if (connectedSinceRef.current) {
        const diff = Date.now() - connectedSinceRef.current;
        const mins = Math.floor(diff / 60_000);
        const hours = Math.floor(mins / 60);
        if (hours > 0) {
          setConnUptime(`${hours}h ${mins % 60}m`);
        } else if (mins > 0) {
          setConnUptime(`${mins}m`);
        } else {
          setConnUptime('< 1m');
        }
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [measureLatency]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await Promise.all([
      gatewayStatus.refresh(),
      activityFeed.refresh(),
      cronJobs.refresh(),
      tokenUsage.refresh(),
      pairedNodesHook.refresh(),
      measureLatency(),
    ]);
    setRefreshing(false);
  }, [gatewayStatus, activityFeed, cronJobs, tokenUsage, pairedNodesHook, measureLatency]);

  // Handle activity item press — navigate to the relevant detail screen
  const handleActivityPress = useCallback(
    (event: ActivityEvent) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      switch (event.category) {
        case 'chat':
          if (event.entityId) {
            router.push({
              pathname: '/(tabs)/chat',
              params: { sessionId: event.entityId },
            });
          }
          break;

        case 'cron':
          if (event.entityId) {
            router.push(`/automations/${event.entityId}`);
          }
          break;

        case 'channel':
          Alert.alert(
            `Channel "${event.entityId ?? '—'}"`,
            `Status: ${event.text}\nLast update: ${event.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}`,
          );
          break;

        default:
          break;
      }
    },
    [router],
  );

  // Derive status pill state
  const pillState = useMemo(() => {
    if (state.thinking) return 'thinking' as const;
    if (state.connected) return 'online' as const;
    return 'offline' as const;
  }, [state.thinking, state.connected]);

  // Model name from live status or store
  const modelName = gatewayStatus.data?.model || state.status?.model || '';

  // Status pill label — show identity name next to status when connected
  const pillLabel = useMemo(() => {
    if (pillState === 'online') {
      return identityName ? `${identityName} · Online` : 'Online';
    }
    return undefined; // use default from StatusPill
  }, [pillState, identityName]);

  // Active automation count
  const enabledJobs = cronJobs.data?.filter((j) => j.enabled).length ?? 0;
  const nextRunText = cronJobs.data ? formatNextRun(cronJobs.data) : '—';

  // Token usage data — use dedicated hook only (gateway status fallback
  // can return stale zero values before the real data arrives)
  const usage = tokenUsage.data ?? null;
  const trend = usage?.trend || [];

  // Compute yesterday comparison
  let todayVsYesterday = '';
  if (trend.length >= 2) {
    const todayTokens = trend[trend.length - 1]?.tokens || 0;
    const yesterdayTokens = trend[trend.length - 2]?.tokens || 0;
    if (yesterdayTokens > 0) {
      const pct = Math.round(((todayTokens - yesterdayTokens) / yesterdayTokens) * 100);
      todayVsYesterday = pct >= 0 ? `+${pct}% vs yesterday` : `${pct}% vs yesterday`;
    }
  }

  // Paired nodes from hook
  const pairedNodes = pairedNodesHook.nodes;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
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
          title="RawClaw"
          leftElement={
            <Image
              source={require('../../assets/claw_icon.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="RawClaw logo"
            />
          }
          rightElement={
            <StatusPill
              state={pillState}
              label={pillLabel}
              onPress={() => router.push('/settings')}
            />
          }
        />

        {/* ─── Gateway Status Card ──────────────────────────────── */}
        {gatewayStatus.loading && !gatewayStatus.data && !state.status ? (
          <SkeletonCard lines={5} />
        ) : !gatewayStatus.data && !state.status ? null : (
          <AnimatedCard
            title="Gateway"
            icon="wifi"
            delay={0}
            headerRight={
              <Pressable
                onPress={editing ? handleCancelEdit : () => setEditing(true)}
                accessibilityRole="button"
                accessibilityLabel={editing ? 'Cancel editing' : 'Edit connection'}
              >
                <Text style={{ color: colors.accent, fontSize: typography.small.fontSize, fontWeight: '600' }}>
                  {editing ? 'Cancel' : 'Edit'}
                </Text>
              </Pressable>
            }
          >
            {editing ? (
              <View>
                <Text
                  style={[
                    styles.editLabel,
                    {
                      color: colors.textMuted,
                      fontSize: typography.small.fontSize,
                      marginBottom: spacing.xs,
                    },
                  ]}
                >
                  GATEWAY URL
                </Text>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderRadius: radius.md,
                      padding: spacing.sm + 2,
                      fontSize: typography.body.fontSize,
                      borderColor: colors.border,
                    },
                  ]}
                  value={editUrl}
                  onChangeText={setEditUrl}
                  placeholder="http://localhost:3000"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Gateway URL"
                />

                <Text
                  style={[
                    styles.editLabel,
                    {
                      color: colors.textMuted,
                      fontSize: typography.small.fontSize,
                      marginTop: spacing.md,
                      marginBottom: spacing.xs,
                    },
                  ]}
                >
                  TOKEN
                </Text>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderRadius: radius.md,
                      padding: spacing.sm + 2,
                      fontSize: typography.body.fontSize,
                      borderColor: colors.border,
                    },
                  ]}
                  value={editToken}
                  onChangeText={setEditToken}
                  placeholder="Enter token"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Gateway Token"
                />

                <View style={[styles.editButtonRow, { marginTop: spacing.md, gap: spacing.sm }]}>
                  <Pressable
                    style={[
                      styles.editTestBtn,
                      {
                        padding: spacing.sm + 2,
                        borderRadius: radius.md,
                        borderColor: colors.accent + '44',
                        flex: 1,
                      },
                    ]}
                    onPress={handleTestConnection}
                    disabled={testing}
                    accessibilityRole="button"
                    accessibilityLabel="Test connection"
                  >
                    {testing ? (
                      <ActivityIndicator color={colors.accent} size="small" />
                    ) : (
                      <>
                        <Ionicons name="wifi" size={16} color={colors.accent} />
                        <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>
                          Test
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={[
                      styles.editSaveBtn,
                      {
                        backgroundColor: colors.accent,
                        borderRadius: radius.md,
                        padding: spacing.sm + 2,
                        flex: 1,
                      },
                    ]}
                    onPress={handleSaveConfig}
                    accessibilityRole="button"
                    accessibilityLabel="Save configuration"
                  >
                    <Ionicons name="save" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Save</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Row label="Gateway URL" value={state.config.url || '—'} copyable />
                <Row
                  label="Status"
                  value={connected ? 'Connected' : 'Disconnected'}
                  valueColor={connected ? colors.success : colors.error}
                />
                <Row label="WebSocket" value={state.wsState} />
                <Row
                  label="Latency"
                  value={latency != null ? `${latency}ms` : '—'}
                  valueColor={
                    latency != null
                      ? getLatencyColor(latency, colors)
                      : colors.textMuted
                  }
                />
                <Row label="Uptime" value={connUptime} />
                <Row
                  label="Session"
                  value={
                    (gatewayStatus.data?.sessionId || state.status?.sessionId || '').slice(0, 12) +
                    (gatewayStatus.data?.sessionId || state.status?.sessionId ? '…' : '—')
                  }
                  copyable
                  copyValue={gatewayStatus.data?.sessionId || state.status?.sessionId || ''}
                />
              </>
            )}
          </AnimatedCard>
        )}

        {/* ─── Model ────────────────────────────────────────────── */}
        {gatewayStatus.loading && !gatewayStatus.data && !state.status ? (
          <SkeletonCard lines={3} />
        ) : !gatewayStatus.data && !state.status ? null : (
          <AnimatedCard
            title="Model"
            icon="hardware-chip"
            delay={80}
            headerRight={
              <Pressable
                onPress={() => setShowModelPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit model"
              >
                <Text style={{ color: colors.accent, fontSize: typography.small.fontSize, fontWeight: '600' }}>
                  Edit
                </Text>
              </Pressable>
            }
          >
            <Row label="Name" value={gatewayStatus.data?.model || state.status?.model || '—'} />
            <Row
              label="Provider"
              value={
                modelName
                  ? modelName.toLowerCase().includes('claude')
                    ? 'Anthropic'
                    : modelName.toLowerCase().includes('gpt')
                    ? 'OpenAI'
                    : '—'
                  : '—'
              }
            />
            <Row label="Context" value={getContextWindowLabel(modelName)} />
          </AnimatedCard>
        )}
        <ModelPicker
          visible={showModelPicker}
          onClose={() => {
            setShowModelPicker(false);
            gatewayStatus.refresh();
          }}
        />

        {/* ─── Recent Activity ──────────────────────────────────── */}
        {activityFeed.loading && activityFeed.data === null ? (
          <SkeletonCard lines={4} />
        ) : activityFeed.data === null ? null : (
          <AnimatedCard title="Recent Activity" icon="time" delay={160}>
            {activityFeed.data && activityFeed.data.length > 0 ? (
              activityFeed.data.slice(0, 8).map((event) => (
                <ActivityItem key={event.id} event={event} onPress={handleActivityPress} />
              ))
            ) : (
              <EmptyState icon="time-outline" message="No recent activity" />
            )}
          </AnimatedCard>
        )}

        {/* ─── Active Automations ───────────────────────────────── */}
        {cronJobs.loading && cronJobs.data === null ? (
          <SkeletonCard lines={2} />
        ) : cronJobs.data === null ? null : (
          <AnimatedCard title="Automations" icon="repeat" delay={240}>
            <View style={styles.usageBigNumbers}>
              <View style={styles.usageStat}>
                <Text
                  style={{
                    color: colors.accent,
                    fontSize: 28,
                    fontWeight: '700',
                  }}
                >
                  {String(enabledJobs)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  Active
                </Text>
              </View>
              <View style={styles.usageStat}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 28,
                    fontWeight: '700',
                  }}
                >
                  {nextRunText}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  Next run
                </Text>
              </View>
            </View>
          </AnimatedCard>
        )}

        {/* ─── Usage ────────────────────────────────────────────── */}
        {tokenUsage.loading && !usage ? (
          <SkeletonCard lines={4} />
        ) : !usage ? null : usage.today > 0 || usage.total > 0 ? (
          <AnimatedCard title="Usage" icon="analytics" delay={320}>
            <View style={[styles.usageBigNumbers, { marginBottom: spacing.md }]}>
              <View style={styles.usageStat}>
                <Text
                  style={{
                    color: colors.accent,
                    fontSize: 28,
                    fontWeight: '700',
                  }}
                >
                  {formatTokenCount(usage.today)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  Tokens today
                </Text>
                {todayVsYesterday ? (
                  <Text
                    style={{
                      color: todayVsYesterday.startsWith('+') ? colors.warning : colors.success,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {todayVsYesterday}
                  </Text>
                ) : null}
              </View>
              <View style={styles.usageStat}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 28,
                    fontWeight: '700',
                  }}
                >
                  {formatTokenCount(usage.total)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  Total tokens
                </Text>
              </View>
            </View>

            {usage.estimatedCost != null && (
              <Row
                label="Estimated Cost Today"
                value={`$${usage.estimatedCost.toFixed(2)}`}
                valueColor={colors.warning}
              />
            )}

            {trend.length > 0 && (
              <View style={{ marginTop: spacing.md }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.label.fontSize,
                    fontWeight: '600',
                    marginBottom: spacing.sm,
                  }}
                >
                  7-Day Trend
                </Text>
                <UsageChart data={trend.slice(-7)} />
              </View>
            )}
          </AnimatedCard>
        ) : (
          <AnimatedCard title="Usage" icon="analytics" delay={320}>
            <EmptyState icon="analytics-outline" message="Usage data unavailable" />
          </AnimatedCard>
        )}

        {/* ─── Paired Nodes ─────────────────────────────────────── */}
        {gatewayStatus.loading && !gatewayStatus.data && !state.status ? (
          <SkeletonCard lines={3} />
        ) : !gatewayStatus.data && !state.status ? null : (
          <AnimatedCard title="Paired Nodes" icon="git-network" delay={400}>
            {pairedNodes.length === 0 ? (
              <EmptyState icon="hardware-chip-outline" message="No paired nodes" />
            ) : (
              pairedNodes.map((node) => (
                <View
                  key={node.id}
                  style={[
                    styles.nodeRow,
                    {
                      paddingVertical: spacing.sm + 2,
                      borderBottomColor: colors.border,
                      gap: spacing.sm,
                    },
                  ]}
                >
                  <Ionicons
                    name={getDeviceIcon(node.type)}
                    size={20}
                    color={node.status === 'online' ? colors.success : colors.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.body.fontSize,
                        fontWeight: '500',
                      }}
                    >
                      {node.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 1 }}>
                      {node.type}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              node.status === 'online' ? colors.success : colors.textMuted,
                          },
                        ]}
                      />
                      <Text
                        style={{
                          color:
                            node.status === 'online' ? colors.success : colors.textMuted,
                          fontSize: 13,
                          fontWeight: '500',
                        }}
                      >
                        {node.status}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                      {timeAgo(node.lastSeen)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </AnimatedCard>
        )}

        {/* ─── Notification Summary ─────────────────────────────── */}
        {gatewayStatus.loading && !gatewayStatus.data && !state.status ? (
          <SkeletonCard lines={2} />
        ) : !gatewayStatus.data && !state.status ? null : (
        <AnimatedCard title="Notifications" icon="notifications" delay={480}>
          <NotificationSummary />
        </AnimatedCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {},
  logo: {
    width: 32,
    height: 32,
  },
  editLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  editInput: {
    borderWidth: 1,
  },
  editButtonRow: {
    flexDirection: 'row',
  },
  editTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
  },
  editSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  usageBigNumbers: {
    flexDirection: 'row',
  },
  usageStat: { flex: 1, alignItems: 'center' },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
