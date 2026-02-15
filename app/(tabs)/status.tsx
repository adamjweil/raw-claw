import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/services/store';
import { useTheme } from '../../src/theme';
import { ScreenHeader, AnimatedCard, Row, SkeletonCard, EmptyState, ModelPicker } from '../../src/components';
import { UsageChart } from '../../src/components/UsageChart';
import { useGatewayStatus, useChannels, useTokenUsage } from '../../src/hooks';
import { GatewayClient } from '../../src/services/gateway';
import { PairedNode, Channel } from '../../src/types';
import { getContextWindowLabel } from '../../src/utils/modelContext';

// ─── Helpers ──────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatTokens(n: number): string {
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

// ─── Flap detection ───────────────────────────────────────────────────

function getChannelFlapInfo(ch: Channel): string | null {
  // If the gateway provides lastFlap info, we check if it's recent
  if (!ch.lastFlap) return null;
  const flapTime = new Date(ch.lastFlap).getTime();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  if (flapTime > oneHourAgo) {
    return 'Unstable';
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────

export default function Status() {
  const { state, saveConfig } = useStore();
  const { colors, spacing, typography, radius } = useTheme();
  const gatewayStatus = useGatewayStatus();
  const channels = useChannels();
  const tokenUsage = useTokenUsage();

  const connected = state.connected;
  const statusData = gatewayStatus.data || state.status;

  // Latency measurement
  const [latency, setLatency] = useState<number | null>(null);
  const [connUptime, setConnUptime] = useState<string>('—');
  const connectedSinceRef = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  // Paired nodes – synthesize from known info + merge any real gateway nodes
  const [gatewayNodes, setGatewayNodes] = useState<PairedNode[]>([]);

  const fetchGatewayNodes = useCallback(async () => {
    if (!state.client) {
      setGatewayNodes([]);
      return;
    }
    try {
      const nodes = await state.client.getPairedNodes();
      setGatewayNodes(nodes);
    } catch {
      setGatewayNodes([]);
    }
  }, [state.client]);

  useEffect(() => {
    fetchGatewayNodes();
  }, [fetchGatewayNodes]);

  // Build synthetic nodes from what we already know
  const pairedNodes = useMemo<PairedNode[]>(() => {
    const nodes: PairedNode[] = [];

    // 1. Gateway host (the computer running OpenClaw)
    const gatewayHost = state.config.url;
    let hostLabel = 'Gateway Host';
    try {
      const urlObj = new URL(gatewayHost);
      const hostname = urlObj.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        hostLabel = 'This Mac';
      } else {
        hostLabel = hostname;
      }
    } catch {
      // keep default label
    }
    nodes.push({
      id: '_gateway_host',
      name: hostLabel,
      type: 'Mac',
      status: connected ? 'online' : 'offline',
      lastSeen: new Date().toISOString(),
    });

    // 2. This device (the phone / tablet running RawClaw)
    const platformName =
      Platform.OS === 'ios'
        ? 'iPhone'
        : Platform.OS === 'android'
        ? 'Android'
        : Platform.OS;
    nodes.push({
      id: '_this_device',
      name: 'RawClaw Mobile',
      type: platformName,
      status: 'online',
      lastSeen: new Date().toISOString(),
    });

    // 3. Merge any real nodes from the gateway (deduplicate by id)
    const syntheticIds = new Set(nodes.map((n) => n.id));
    for (const gn of gatewayNodes) {
      if (!syntheticIds.has(gn.id)) {
        nodes.push(gn);
      }
    }

    return nodes;
  }, [connected, state.config.url, gatewayNodes]);

  // Measure latency
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    gatewayStatus.refresh();
    channels.refresh();
    tokenUsage.refresh();
    measureLatency();
    fetchGatewayNodes();
    setTimeout(() => setRefreshing(false), 600);
  }, [gatewayStatus, channels, tokenUsage, measureLatency, fetchGatewayNodes]);

  // Token usage data — prefer dedicated hook, fallback to status response
  const usage = tokenUsage.data ?? statusData?.tokenUsage ?? null;
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: spacing.lg, paddingBottom: 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <ScreenHeader title="Status" />

        {/* ─── Connection Health ──────────────────────────────────── */}
        {gatewayStatus.loading && !statusData ? (
          <SkeletonCard lines={3} />
        ) : (
          <AnimatedCard
            title="Connection"
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
                <Row label="Gateway URL" value={state.config.url || '—'} />
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
              </>
            )}
          </AnimatedCard>
        )}

        {/* ─── Model ────────────────────────────────────────────── */}
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
          <Row label="Name" value={statusData?.model || '—'} />
          <Row
            label="Provider"
            value={
              statusData?.model
                ? statusData.model.toLowerCase().includes('claude')
                  ? 'Anthropic'
                  : statusData.model.toLowerCase().includes('gpt')
                  ? 'OpenAI'
                  : '—'
                : '—'
            }
          />
          <Row label="Context" value={getContextWindowLabel(statusData?.model)} />
        </AnimatedCard>
        <ModelPicker
          visible={showModelPicker}
          onClose={() => {
            setShowModelPicker(false);
            gatewayStatus.refresh();
          }}
        />

        {/* ─── Token Usage ──────────────────────────────────────── */}
        {tokenUsage.loading && !usage ? (
          <SkeletonCard lines={4} />
        ) : usage ? (
          <AnimatedCard title="Usage" icon="analytics" delay={160}>
            <View style={[styles.usageBigNumbers, { marginBottom: spacing.md }]}>
              <View style={styles.usageStat}>
                <Text
                  style={{
                    color: colors.accent,
                    fontSize: 28,
                    fontWeight: '700',
                  }}
                >
                  {formatTokens(usage.today)}
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
                  {formatTokens(usage.total)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  Total tokens
                </Text>
              </View>
            </View>

            {usage.estimatedCost != null && (
              <Row
                label="Estimated Cost Today"
                value={formatCurrency(usage.estimatedCost)}
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
          <AnimatedCard title="Usage" icon="analytics" delay={160}>
            <View style={styles.centered}>
              <Ionicons name="analytics-outline" size={32} color={colors.textMuted + '66'} />
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.body.fontSize,
                  marginTop: spacing.sm,
                }}
              >
                Usage data unavailable
              </Text>
            </View>
          </AnimatedCard>
        )}

        {/* ─── Paired Nodes ─────────────────────────────────────── */}
        <AnimatedCard title="Paired Nodes" icon="git-network" delay={240}>
          {pairedNodes.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="hardware-chip-outline" size={32} color={colors.textMuted + '66'} />
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.body.fontSize,
                  marginTop: spacing.sm,
                }}
              >
                No paired nodes
              </Text>
            </View>
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

        {/* ─── Channels ────────────────────────────────────────── */}
        {channels.loading && !channels.data ? (
          <SkeletonCard lines={2} />
        ) : (
          <AnimatedCard title="Channels" icon="chatbubbles" delay={320}>
            {channels.data && channels.data.length > 0 ? (
              channels.data.map((ch) => {
                const statusColor =
                  ch.status === 'active'
                    ? colors.success
                    : ch.status === 'error'
                    ? colors.error
                    : ch.status === 'disconnected'
                    ? colors.warning
                    : colors.textMuted;

                const iconName =
                  (ch.icon as keyof typeof Ionicons.glyphMap) ||
                  (ch.name.toLowerCase().includes('whatsapp')
                    ? 'logo-whatsapp'
                    : ch.name.toLowerCase().includes('discord')
                    ? 'logo-discord'
                    : ch.name.toLowerCase().includes('telegram')
                    ? 'paper-plane'
                    : ch.name.toLowerCase().includes('slack')
                    ? 'chatbox'
                    : 'radio');

                const flapWarning = getChannelFlapInfo(ch);

                return (
                  <View
                    key={ch.name}
                    style={[
                      styles.channelRow,
                      {
                        gap: spacing.sm + 2,
                        paddingVertical: spacing.sm + 2,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons name={iconName} size={18} color={statusColor} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontWeight: typography.label.fontWeight,
                            fontSize: 14,
                          }}
                        >
                          {ch.name}
                        </Text>
                        {flapWarning && (
                          <View
                            style={[
                              styles.flapBadge,
                              {
                                backgroundColor: colors.warning + '22',
                                borderRadius: 4,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                              },
                            ]}
                          >
                            <Text style={{ color: colors.warning, fontSize: 10, fontWeight: '600' }}>
                              ⚠️ {flapWarning}
                            </Text>
                          </View>
                        )}
                      </View>
                      {ch.uptime && ch.status === 'active' && (
                        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>
                          Up for {ch.uptime}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.channelStatus, { color: statusColor }]}>
                      {ch.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.centered}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={32}
                  color={colors.textMuted + '66'}
                />
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.body.fontSize,
                    marginTop: spacing.sm,
                  }}
                >
                  No channels configured
                </Text>
              </View>
            )}
          </AnimatedCard>
        )}

        {/* ─── Gateway ─────────────────────────────────────────── */}
        <AnimatedCard title="Gateway" icon="server" delay={400}>
          <Row label="Version" value={statusData?.version || '—'} />
          <Row label="Uptime" value={statusData?.uptime || '—'} />
        </AnimatedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {},
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
    justifyContent: 'space-around',
  },
  usageStat: { alignItems: 'center' },
  centered: { alignItems: 'center', paddingVertical: 24 },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  channelStatus: { fontSize: 13, fontWeight: '500' },
  flapBadge: {},
});
