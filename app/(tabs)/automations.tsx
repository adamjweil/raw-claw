import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CronJob } from '../../src/types';

const C = { bg: '#0a0a0f', surface: '#1a1a2e', card: '#16213e', accent: '#0ea5e9' };

const PLACEHOLDER_JOBS: CronJob[] = [
  { id: '1', name: 'Daily Summary', schedule: '0 9 * * *', scheduleHuman: 'Every day at 9:00 AM', enabled: true, lastRun: '2025-02-14T09:00:00Z', lastStatus: 'success', nextRun: '2025-02-15T09:00:00Z' },
  { id: '2', name: 'Email Check', schedule: '*/30 * * * *', scheduleHuman: 'Every 30 minutes', enabled: true, lastRun: '2025-02-14T16:30:00Z', lastStatus: 'success', nextRun: '2025-02-14T17:00:00Z' },
  { id: '3', name: 'Weather Alert', schedule: '0 7,18 * * *', scheduleHuman: 'Every day at 7 AM & 6 PM', enabled: true, lastRun: '2025-02-14T07:00:00Z', lastStatus: 'success', nextRun: '2025-02-14T18:00:00Z' },
  { id: '4', name: 'Memory Cleanup', schedule: '0 3 * * 0', scheduleHuman: 'Every Sunday at 3:00 AM', enabled: false, lastRun: '2025-02-09T03:00:00Z', lastStatus: 'success', nextRun: '2025-02-16T03:00:00Z' },
  { id: '5', name: 'Heartbeat Check', schedule: '*/15 * * * *', scheduleHuman: 'Every 15 minutes', enabled: true, lastRun: '2025-02-14T16:45:00Z', lastStatus: 'error', nextRun: '2025-02-14T17:00:00Z' },
];

function StatusBadge({ status }: { status: string | null }) {
  const color = status === 'success' ? '#10b981' : status === 'error' ? '#ef4444' : '#888';
  return (
    <View style={[s.badge, { backgroundColor: color + '22' }]}>
      <View style={[s.badgeDot, { backgroundColor: color }]} />
      <Text style={[s.badgeText, { color }]}>{status || 'pending'}</Text>
    </View>
  );
}

export default function Automations() {
  const [jobs, setJobs] = useState(PLACEHOLDER_JOBS);
  const [selected, setSelected] = useState<CronJob | null>(null);

  const toggle = (id: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, enabled: !j.enabled } : j)));
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Automations</Text>
        <Text style={s.subtitle}>{jobs.filter((j) => j.enabled).length} active</Text>

        {jobs.map((job, i) => (
          <Animated.View key={job.id} entering={FadeInDown.delay(i * 60).duration(350)}>
            <Pressable style={s.card} onPress={() => setSelected(job)}>
              <View style={s.cardTop}>
                <Text style={s.jobName}>{job.name}</Text>
                <Switch
                  value={job.enabled}
                  onValueChange={() => toggle(job.id)}
                  trackColor={{ true: C.accent + '44', false: '#333' }}
                  thumbColor={job.enabled ? C.accent : '#666'}
                />
              </View>
              <Text style={s.schedule}>{job.scheduleHuman}</Text>
              <View style={s.cardBottom}>
                <StatusBadge status={job.lastStatus} />
                <Pressable style={s.runBtn} onPress={() => {}}>
                  <Ionicons name="play" size={14} color={C.accent} />
                  <Text style={s.runText}>Run Now</Text>
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setSelected(null)}>
          <View style={s.modal}>
            <View style={s.modalHandle} />
            {selected && (
              <>
                <Text style={s.modalTitle}>{selected.name}</Text>
                <View style={s.modalRow}><Text style={s.modalLabel}>Schedule</Text><Text style={s.modalValue}>{selected.scheduleHuman}</Text></View>
                <View style={s.modalRow}><Text style={s.modalLabel}>Cron</Text><Text style={[s.modalValue, { fontFamily: 'monospace' }]}>{selected.schedule}</Text></View>
                <View style={s.modalRow}><Text style={s.modalLabel}>Last Run</Text><Text style={s.modalValue}>{selected.lastRun ? new Date(selected.lastRun).toLocaleString() : '—'}</Text></View>
                <View style={s.modalRow}><Text style={s.modalLabel}>Status</Text><StatusBadge status={selected.lastStatus} /></View>
                <View style={s.modalRow}><Text style={s.modalLabel}>Next Run</Text><Text style={s.modalValue}>{selected.nextRun ? new Date(selected.nextRun).toLocaleString() : '—'}</Text></View>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 20, marginTop: 4 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  schedule: { color: '#888', fontSize: 13, marginTop: 6 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 5 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  runBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  runText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modal: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 20 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalLabel: { color: '#888', fontSize: 14 },
  modalValue: { color: '#ddd', fontSize: 14, fontWeight: '500' },
});
