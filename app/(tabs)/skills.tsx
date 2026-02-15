import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { ScreenHeader, SkeletonCard, EmptyState, ErrorState } from '../../src/components';
import { ClawHubBrowser } from '../../src/components/ClawHubBrowser';
import { useSkills } from '../../src/hooks';
import { Skill } from '../../src/types';

const COLS = 3;
const GAP = 12;
const PAD = 20;
const TILE = (Dimensions.get('window').width - PAD * 2 - GAP * (COLS - 1)) / COLS;

// Keyword → Ionicons icon mapping. Keys are matched as substrings of skill names.
const ICON_KEYWORDS: [string, keyof typeof Ionicons.glyphMap][] = [
  // Specific skill names first (checked before generic keywords)
  ['1password', 'key'],
  ['password', 'key'],
  ['whatsapp', 'logo-whatsapp'],
  ['discord', 'logo-discord'],
  ['twitter', 'logo-twitter'],
  ['bluebubbles', 'chatbubbles'],
  ['blucli', 'terminal'],
  ['blogwatcher', 'newspaper'],
  ['camsnap', 'camera'],
  ['clawhub', 'cloud-download'],
  ['coding-agent', 'code-slash'],
  ['eightctl', 'settings'],
  ['gemini', 'sparkles'],
  ['apple-notes', 'document-text'],
  ['bear-notes', 'document-text'],
  ['apple-reminders', 'checkbox'],
  ['smart.home', 'home'],
  ['smart_home', 'home'],
  ['imsg', 'chatbubble'],
  ['imessage', 'chatbubble'],
  ['local-places', 'location'],
  ['mcporter', 'swap-horizontal'],
  ['model-usage', 'bar-chart'],
  ['nano-banana', 'hardware-chip'],
  ['nano-pdf', 'document-attach'],
  ['notion', 'book'],
  ['obsidian', 'create'],
  ['openhue', 'bulb'],
  ['oracle', 'server'],
  ['peekaboo', 'eye'],
  ['openai', 'sparkles'],
  ['gpt', 'sparkles'],
  ['llm', 'sparkles'],
  ['pdf', 'document-attach'],
  ['doc', 'document-text'],
  ['slack', 'chatbubbles'],
  ['telegram', 'paper-plane'],
  ['signal', 'chatbubble-ellipses'],
  ['spotify', 'musical-notes'],
  ['youtube', 'play-circle'],
  ['github', 'logo-github'],
  ['gitlab', 'git-branch'],
  ['jira', 'clipboard'],
  ['trello', 'albums'],
  ['todoist', 'checkbox'],
  ['reminder', 'checkbox'],
  ['todo', 'checkbox'],
  ['task', 'checkbox'],
  ['stripe', 'card'],
  ['pay', 'card'],
  ['mqtt', 'radio'],
  ['zigbee', 'radio'],
  ['zwave', 'radio'],
  ['hue', 'bulb'],
  ['light', 'bulb'],
  ['lamp', 'bulb'],
  ['sensor', 'thermometer'],
  ['temp', 'thermometer'],
  ['thermo', 'thermometer'],
  ['screen', 'desktop'],
  ['display', 'desktop'],
  ['monitor', 'desktop'],
  ['port', 'swap-horizontal'],
  ['proxy', 'swap-horizontal'],
  ['bridge', 'swap-horizontal'],
  ['usage', 'bar-chart'],
  ['stats', 'bar-chart'],
  ['metric', 'bar-chart'],
  ['log', 'list'],
  ['history', 'time'],
  ['scrape', 'globe'],
  ['crawl', 'globe'],
  ['fetch', 'globe'],
  ['http', 'globe'],
  ['rest', 'globe'],
  ['plugin', 'extension-puzzle'],
  ['script', 'code-slash'],
  ['run', 'play'],
  ['exec', 'play'],
  ['test', 'flask'],
  ['debug', 'bug'],
  ['watch', 'eye'],
  ['peek', 'eye'],
  // Generic keyword matches
  ['email', 'mail'],
  ['mail', 'mail'],
  ['calendar', 'calendar'],
  ['weather', 'cloud'],
  ['ssh', 'terminal'],
  ['terminal', 'terminal'],
  ['cli', 'terminal'],
  ['camera', 'camera'],
  ['photo', 'camera'],
  ['snap', 'camera'],
  ['web', 'globe'],
  ['browser', 'browsers'],
  ['tts', 'volume-high'],
  ['speech', 'volume-high'],
  ['voice', 'mic'],
  ['notes', 'document-text'],
  ['note', 'document-text'],
  ['git', 'git-branch'],
  ['search', 'search'],
  ['music', 'musical-notes'],
  ['audio', 'musical-notes'],
  ['timer', 'timer'],
  ['cron', 'timer'],
  ['schedule', 'timer'],
  ['location', 'location'],
  ['gps', 'location'],
  ['map', 'map'],
  ['translate', 'language'],
  ['lang', 'language'],
  ['code', 'code-slash'],
  ['coding', 'code-slash'],
  ['dev', 'code-slash'],
  ['image', 'image'],
  ['news', 'newspaper'],
  ['blog', 'newspaper'],
  ['rss', 'newspaper'],
  ['finance', 'trending-up'],
  ['stock', 'trending-up'],
  ['health', 'fitness'],
  ['fitness', 'fitness'],
  ['home', 'home'],
  ['hub', 'cloud-download'],
  ['database', 'server'],
  ['db', 'server'],
  ['api', 'link'],
  ['automation', 'repeat'],
  ['auto', 'repeat'],
  ['security', 'shield-checkmark'],
  ['auth', 'shield-checkmark'],
  ['analytics', 'analytics'],
  ['notification', 'notifications'],
  ['alert', 'notifications'],
  ['chat', 'chatbubbles'],
  ['message', 'chatbubbles'],
  ['ai', 'sparkles'],
  ['bot', 'hardware-chip'],
  ['agent', 'hardware-chip'],
  ['file', 'folder'],
  ['folder', 'folder'],
  ['sync', 'sync'],
  ['backup', 'cloud-upload'],
  ['cloud', 'cloud'],
  ['download', 'cloud-download'],
  ['upload', 'cloud-upload'],
  ['key', 'key'],
  ['lock', 'lock-closed'],
  ['wifi', 'wifi'],
  ['bluetooth', 'bluetooth'],
];

/** Find the best matching Ionicons icon for a skill name */
function resolveSkillIcon(skillName: string): keyof typeof Ionicons.glyphMap {
  const lower = skillName.toLowerCase();
  for (const [keyword, icon] of ICON_KEYWORDS) {
    if (lower.includes(keyword)) return icon;
  }
  return 'extension-puzzle';
}

type TabType = 'installed' | 'clawhub';

export default function Skills() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const liveSkills = useSkills();
  const [tab, setTab] = useState<TabType>('installed');
  const [refreshing, setRefreshing] = useState(false);

  const skills = liveSkills.data || [];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    liveSkills.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }, [liveSkills]);

  const navigateToSkill = useCallback(
    (skill: Skill) => {
      router.push(`/skills/${skill.id}` as never);
    },
    [router]
  );

  const installedCount = skills.filter((s) => s.enabled !== false).length;
  const disabledCount = skills.filter((s) => s.enabled === false).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={{ paddingHorizontal: PAD, paddingTop: PAD }}>
        <ScreenHeader title="Skills" />

        {/* Tab switcher */}
        <View style={[styles.tabRow, { marginTop: -8, marginBottom: spacing.md }]}>
          {(['installed', 'clawhub'] as const).map((t) => {
            const isActive = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[
                  styles.tabBtn,
                  {
                    backgroundColor: isActive ? colors.accent + '22' : 'transparent',
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.sm,
                    borderWidth: isActive ? 1 : 0,
                    borderColor: colors.accent + '44',
                  },
                ]}
              >
                <Ionicons
                  name={t === 'installed' ? 'apps' : 'cloud-download'}
                  size={16}
                  color={isActive ? colors.accent : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: isActive ? colors.accent : colors.textMuted,
                    fontSize: typography.body.fontSize,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {t === 'installed' ? 'Installed' : 'ClawHub'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {tab === 'installed' ? (
        <ScrollView
          contentContainerStyle={[styles.scroll, { padding: PAD, paddingTop: 0, paddingBottom: 40 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
          <View style={[styles.countBadge, { backgroundColor: colors.accent + '22', marginBottom: spacing.lg }]}>
            <Text style={[styles.countText, { color: colors.accent }]}>
              {skills.length} skills{disabledCount > 0 ? ` (${disabledCount} disabled)` : ''}
            </Text>
          </View>

          {liveSkills.loading && !liveSkills.data ? (
            <>
              <SkeletonCard lines={4} />
              <SkeletonCard lines={4} />
            </>
          ) : liveSkills.error && !liveSkills.data ? (
            <ErrorState message={liveSkills.error} onRetry={liveSkills.refresh} />
          ) : skills.length === 0 ? (
            <EmptyState icon="extension-puzzle-outline" message="No skills installed" />
          ) : (
            <View style={[styles.grid, { gap: GAP }]}>
              {skills.map((skill) => {
                const disabled = skill.enabled === false;
                const rawIcon = skill.icon as string;
                const iconName =
                  rawIcon && rawIcon in Ionicons.glyphMap
                    ? (rawIcon as keyof typeof Ionicons.glyphMap)
                    : resolveSkillIcon(skill.name);

                return (
                  <Pressable
                    key={skill.id}
                    style={[
                      styles.tile,
                      {
                        width: TILE,
                        height: TILE,
                        backgroundColor: colors.card,
                        borderRadius: radius.lg,
                        borderColor: disabled ? colors.border + '44' : colors.border,
                        opacity: disabled ? 0.5 : 1,
                      },
                    ]}
                    onPress={() => navigateToSkill(skill)}
                  >
                    <Ionicons
                      name={iconName}
                      size={26}
                      color={disabled ? colors.textMuted : colors.accent}
                    />
                    <Text
                      style={[
                        styles.tileName,
                        { color: disabled ? colors.textMuted : colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {skill.name}
                    </Text>
                    {disabled && (
                      <View
                        style={[
                          styles.disabledBadge,
                          {
                            backgroundColor: colors.textMuted + '33',
                            borderRadius: 4,
                            paddingHorizontal: 4,
                            paddingVertical: 1,
                          },
                        ]}
                      >
                        <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '600' }}>
                          OFF
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: PAD, paddingTop: 0, paddingBottom: 40 }}>
          <ClawHubBrowser
            onNavigateToSkill={navigateToSkill}
            onInstalled={() => liveSkills.refresh()}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {},
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: { flexDirection: 'row', alignItems: 'center' },
  countBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  countText: { fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  tileName: { fontSize: 11, fontWeight: '600', textAlign: 'center', paddingHorizontal: 4 },
  disabledBadge: { position: 'absolute', top: 6, right: 6 },
});
