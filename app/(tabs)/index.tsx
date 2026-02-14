import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStore } from '../../src/services/store';

const C = { bg: '#0a0a0f', surface: '#1a1a2e', card: '#16213e', accent: '#0ea5e9' };

function Card({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={s.card}>
      {children}
    </Animated.View>
  );
}

export default function Home() {
  const { state } = useStore();
  const router = useRouter();
  const connected = state.connected;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Paw 🐾</Text>
          <Pressable onPress={() => router.push('/settings')} style={s.headerRight}>
            <View style={[s.pill, connected ? s.pillOn : s.pillOff]}>
              <View style={[s.dot, connected ? s.dotOn : s.dotOff]} />
              <Text style={s.pillText}>{connected ? 'Connected' : 'Offline'}</Text>
            </View>
          </Pressable>
        </View>

        {/* Status Card */}
        <Card delay={0}>
          <View style={s.cardHeader}>
            <Ionicons name="server" size={18} color={C.accent} />
            <Text style={s.cardTitle}>Gateway Status</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Model</Text>
            <Text style={s.value}>{state.status?.model || 'claude-opus-4-0-20250514'}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Uptime</Text>
            <Text style={s.value}>{state.status?.uptime || '—'}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Session</Text>
            <Text style={s.value}>{state.status?.sessionId?.slice(0, 12) || '—'}…</Text>
          </View>
        </Card>

        {/* Quick Actions */}
        <Card delay={80}>
          <View style={s.cardHeader}>
            <Ionicons name="flash" size={18} color={C.accent} />
            <Text style={s.cardTitle}>Quick Actions</Text>
          </View>
          <View style={s.actions}>
            {['Check Email', 'Weather', 'Run Crons', 'Status'].map((label, i) => (
              <Pressable key={i} style={s.actionBtn}>
                <Ionicons
                  name={['mail', 'cloud', 'timer', 'pulse'][i] as any}
                  size={20}
                  color="#fff"
                />
                <Text style={s.actionLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Recent Activity */}
        <Card delay={160}>
          <View style={s.cardHeader}>
            <Ionicons name="time" size={18} color={C.accent} />
            <Text style={s.cardTitle}>Recent Activity</Text>
          </View>
          {[
            { text: 'Email check — 3 new messages', time: '2m ago' },
            { text: 'Cron: daily-summary completed', time: '1h ago' },
            { text: 'WhatsApp message sent', time: '2h ago' },
            { text: 'Calendar reminder: Team sync', time: '3h ago' },
            { text: 'Weather alert: Rain tonight', time: '5h ago' },
          ].map((item, i) => (
            <View key={i} style={s.activityRow}>
              <Text style={s.activityText}>{item.text}</Text>
              <Text style={s.activityTime}>{item.time}</Text>
            </View>
          ))}
        </Card>

        {/* Automations */}
        <Card delay={240}>
          <View style={s.cardHeader}>
            <Ionicons name="repeat" size={18} color={C.accent} />
            <Text style={s.cardTitle}>Active Automations</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Running</Text>
            <Text style={[s.value, { color: C.accent }]}>{state.cronJobs.filter((c) => c.enabled).length || 5}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Next run</Text>
            <Text style={s.value}>in 12 minutes</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerRight: {},
  title: { fontSize: 32, fontWeight: '800', color: '#fff' },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pillOn: { backgroundColor: 'rgba(16,185,129,0.15)' },
  pillOff: { backgroundColor: 'rgba(239,68,68,0.15)' },
  pillText: { color: '#ccc', fontSize: 12, fontWeight: '600', marginLeft: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: '#10b981' },
  dotOff: { backgroundColor: '#ef4444' },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#888', fontSize: 14 },
  value: { color: '#ddd', fontSize: 14, fontWeight: '500' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: '47%' as any,
    gap: 6,
  },
  actionLabel: { color: '#ccc', fontSize: 12, fontWeight: '600' },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  activityText: { color: '#ccc', fontSize: 13, flex: 1 },
  activityTime: { color: '#666', fontSize: 12, marginLeft: 8 },
});
