import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Skill } from '../../src/types';

const C = { bg: '#0a0a0f', surface: '#1a1a2e', card: '#16213e', accent: '#0ea5e9' };
const COLS = 3;
const GAP = 12;
const PAD = 20;
const TILE = (Dimensions.get('window').width - PAD * 2 - GAP * (COLS - 1)) / COLS;

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  email: 'mail', calendar: 'calendar', weather: 'cloud', twitter: 'logo-twitter',
  whatsapp: 'logo-whatsapp', discord: 'logo-discord', ssh: 'terminal', camera: 'camera',
  web: 'globe', tts: 'volume-high', notes: 'document-text', git: 'git-branch',
  search: 'search', music: 'musical-notes', timer: 'timer', location: 'location',
  translate: 'language', code: 'code-slash', image: 'image', news: 'newspaper',
  finance: 'trending-up', health: 'fitness', smart_home: 'home', browser: 'browsers',
  voice: 'mic', database: 'server', api: 'link', automation: 'repeat',
  security: 'shield-checkmark', analytics: 'analytics', notification: 'notifications',
};

const PLACEHOLDER_SKILLS: Skill[] = Object.entries(ICONS).map(([key, icon], i) => ({
  id: String(i),
  name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  description: `The ${key} skill provides integration with ${key} services and functionality.`,
  icon,
  enabled: true,
}));

export default function Skills() {
  const [selected, setSelected] = useState<Skill | null>(null);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Skills</Text>
        <View style={s.countBadge}>
          <Text style={s.countText}>{PLACEHOLDER_SKILLS.length} skills installed</Text>
        </View>

        <View style={s.grid}>
          {PLACEHOLDER_SKILLS.map((skill, i) => (
            <Animated.View key={skill.id} entering={FadeInUp.delay(i * 25).duration(300)}>
              <Pressable style={s.tile} onPress={() => setSelected(skill)}>
                <Ionicons name={skill.icon as any} size={26} color={C.accent} />
                <Text style={s.tileName} numberOfLines={1}>{skill.name}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={s.overlay} onPress={() => setSelected(null)}>
          <View style={s.modal}>
            {selected && (
              <>
                <Ionicons name={selected.icon as any} size={40} color={C.accent} />
                <Text style={s.modalTitle}>{selected.name}</Text>
                <Text style={s.modalDesc}>{selected.description}</Text>
                <View style={s.modalBadge}>
                  <View style={[s.modalDot, { backgroundColor: '#10b981' }]} />
                  <Text style={s.modalStatus}>Installed</Text>
                </View>
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
  scroll: { padding: PAD, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  countBadge: { backgroundColor: C.accent + '22', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginTop: 8, marginBottom: 20 },
  countText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: {
    width: TILE, height: TILE,
    backgroundColor: C.card, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  tileName: { color: '#ccc', fontSize: 11, fontWeight: '600', textAlign: 'center', paddingHorizontal: 4 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modal: { backgroundColor: C.surface, borderRadius: 20, padding: 28, alignItems: 'center', width: '80%' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 12 },
  modalDesc: { color: '#aaa', fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  modalBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  modalDot: { width: 8, height: 8, borderRadius: 4 },
  modalStatus: { color: '#10b981', fontSize: 13, fontWeight: '600' },
});
