import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStore } from '../../src/services/store';

const C = { bg: '#0a0a0f', surface: '#1a1a2e', card: '#16213e', accent: '#0ea5e9' };

function Section({ title, icon, children, delay = 0 }: { title: string; icon: string; children: React.ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={s.card}>
      <View style={s.cardHeader}>
        <Ionicons name={icon as any} size={18} color={C.accent} />
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      {children}
    </Animated.View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

export default function Status() {
  const { state } = useStore();
  const connected = state.connected;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Status</Text>

        <Section title="Connection" icon="wifi" delay={0}>
          <Row label="Gateway URL" value={state.config.url} />
          <Row label="Status" value={connected ? 'Connected' : 'Disconnected'} valueColor={connected ? '#10b981' : '#ef4444'} />
          <Row label="Latency" value={connected ? '42ms' : '—'} />
        </Section>

        <Section title="Model" icon="hardware-chip" delay={80}>
          <Row label="Name" value={state.status?.model || 'claude-opus-4-0-20250514'} />
          <Row label="Provider" value="Anthropic" />
          <Row label="Context" value="200K tokens" />
        </Section>

        <Section title="Channels" icon="chatbubbles" delay={160}>
          <View style={s.channelRow}>
            <Ionicons name="logo-whatsapp" size={18} color="#25d366" />
            <Text style={s.channelName}>WhatsApp</Text>
            <View style={[s.statusDot, { backgroundColor: '#10b981' }]} />
            <Text style={s.channelStatus}>Active</Text>
          </View>
          <View style={s.channelRow}>
            <Ionicons name="logo-discord" size={18} color="#5865f2" />
            <Text style={s.channelName}>Discord</Text>
            <View style={[s.statusDot, { backgroundColor: '#888' }]} />
            <Text style={[s.channelStatus, { color: '#888' }]}>Not configured</Text>
          </View>
        </Section>

        <Section title="Gateway" icon="server" delay={240}>
          <Row label="Version" value={state.status?.version || '1.0.0'} />
          <Row label="Uptime" value={state.status?.uptime || '—'} />
          <Row label="Runtime" value="Node.js v25.6.0" />
          <Row label="OS" value="Darwin arm64" />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 20 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  label: { color: '#888', fontSize: 14 },
  value: { color: '#ddd', fontSize: 14, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  channelName: { color: '#ddd', fontSize: 14, fontWeight: '600', flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  channelStatus: { color: '#10b981', fontSize: 13, fontWeight: '500' },
});
