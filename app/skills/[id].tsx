import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Markdown from '@ronradtke/react-native-markdown-display';
import { useTheme } from '../../src/theme';
import { useStore } from '../../src/services/store';
import { useSkills } from '../../src/hooks';
import { AnimatedCard, Row, SkeletonCard, ErrorState } from '../../src/components';
import { Skill } from '../../src/types';

type DetailTab = 'description' | 'documentation';

export default function SkillDetail() {
  const { colors, spacing, radius, typography } = useTheme();
  const { state } = useStore();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const liveSkills = useSkills();

  const [detailTab, setDetailTab] = useState<DetailTab>('description');
  const [toggling, setToggling] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [optimisticEnabled, setOptimisticEnabled] = useState<boolean | null>(null);

  const skill = liveSkills.data?.find((s) => s.id === id) || null;
  const isClawHub = skill?.source === 'clawhub';
  const isEnabled =
    optimisticEnabled !== null ? optimisticEnabled : skill?.enabled ?? true;

  const handleToggle = useCallback(async () => {
    if (!state.client || !skill) return;
    const newEnabled = !isEnabled;
    setOptimisticEnabled(newEnabled);
    setToggling(true);
    try {
      await state.client.toggleSkill(skill.id, newEnabled);
      liveSkills.refresh();
    } catch {
      setOptimisticEnabled(null); // revert
      Alert.alert('Error', 'Failed to toggle skill.');
    } finally {
      setToggling(false);
    }
  }, [state.client, skill, isEnabled, liveSkills]);

  const handleInstall = useCallback(async () => {
    if (!state.client || !skill) return;
    Alert.alert(
      'Install Skill',
      `Install "${skill.name}"?\n\n${skill.description}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Install',
          onPress: async () => {
            setInstalling(true);
            try {
              await state.client!.installSkill(skill.id);
              liveSkills.refresh();
              Alert.alert('Installed', `${skill.name} has been installed.`);
            } catch {
              Alert.alert('Error', `Failed to install ${skill.name}.`);
            } finally {
              setInstalling(false);
            }
          },
        },
      ]
    );
  }, [state.client, skill, liveSkills]);

  const markdownStyles = {
    body: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
    heading1: { color: colors.text, fontSize: 20, fontWeight: '700' as const },
    heading2: { color: colors.text, fontSize: 18, fontWeight: '600' as const },
    heading3: { color: colors.text, fontSize: 16, fontWeight: '600' as const },
    code_inline: {
      backgroundColor: colors.card,
      color: colors.accent,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    code_block: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 12,
    },
    link: { color: colors.accent },
  };

  if (liveSkills.loading && !liveSkills.data) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={{ padding: spacing.lg }}>
          <SkeletonCard lines={5} />
        </View>
      </SafeAreaView>
    );
  }

  if (!skill) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={{ padding: spacing.lg }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <ErrorState message="Skill not found" onRetry={liveSkills.refresh} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.lg, paddingBottom: 40 }]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Skill icon + name */}
        <View style={[styles.heroSection, { marginTop: spacing.lg }]}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: colors.accent + '15',
                borderRadius: radius.xl,
                width: 80,
                height: 80,
              },
            ]}
          >
            <Ionicons
              name={(skill.icon as keyof typeof Ionicons.glyphMap) || 'extension-puzzle'}
              size={40}
              color={colors.accent}
            />
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: 24,
              fontWeight: '700',
              marginTop: spacing.md,
            }}
          >
            {skill.name}
          </Text>
          {skill.version && (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.small.fontSize,
                marginTop: 4,
              }}
            >
              v{skill.version}
            </Text>
          )}
          <View style={[styles.statusBadge, { marginTop: spacing.sm }]}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: isClawHub
                    ? colors.info
                    : isEnabled
                    ? colors.success
                    : colors.textMuted,
                },
              ]}
            />
            <Text
              style={{
                color: isClawHub
                  ? colors.info
                  : isEnabled
                  ? colors.success
                  : colors.textMuted,
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {isClawHub ? 'Available' : isEnabled ? 'Installed & Active' : 'Disabled'}
            </Text>
          </View>
        </View>

        {/* Enable/Disable or Install */}
        <View style={[styles.actionSection, { marginTop: spacing.lg }]}>
          {isClawHub ? (
            <Pressable
              style={[
                styles.installBtn,
                {
                  backgroundColor: colors.accent,
                  borderRadius: radius.md,
                  paddingVertical: spacing.md,
                },
              ]}
              onPress={handleInstall}
              disabled={installing}
            >
              {installing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 16 }}>
                    Install
                  </Text>
                </>
              )}
            </Pressable>
          ) : (
            <View
              style={[
                styles.toggleRow,
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <View>
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
                  {isEnabled
                    ? 'This skill is active and available'
                    : 'This skill is currently disabled'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {toggling && (
                  <ActivityIndicator
                    size="small"
                    color={colors.accent}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Switch
                  value={isEnabled}
                  onValueChange={handleToggle}
                  trackColor={{ true: colors.accent + '44', false: '#333' }}
                  thumbColor={isEnabled ? colors.accent : '#666'}
                  disabled={toggling}
                />
              </View>
            </View>
          )}
        </View>

        {/* Tab switcher: Description / Documentation */}
        <View style={[styles.tabRow, { marginTop: spacing.lg, marginBottom: spacing.md }]}>
          {(['description', 'documentation'] as const).map((t) => {
            const isActive = detailTab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setDetailTab(t)}
                style={[
                  styles.tabBtn,
                  {
                    borderBottomWidth: 2,
                    borderBottomColor: isActive ? colors.accent : 'transparent',
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isActive ? colors.accent : colors.textMuted,
                    fontWeight: isActive ? '600' : '400',
                    fontSize: typography.body.fontSize,
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {detailTab === 'description' ? (
          <View>
            <AnimatedCard delay={0}>
              <Markdown style={markdownStyles}>
                {skill.description || 'No description available.'}
              </Markdown>
            </AnimatedCard>

            {/* Usage stats */}
            {skill.usage && (
              <AnimatedCard title="Usage" icon="bar-chart" delay={80}>
                <Row label="Times Used" value={String(skill.usage.count)} />
                <Row
                  label="Last Used"
                  value={
                    skill.usage.lastUsed
                      ? new Date(skill.usage.lastUsed).toLocaleDateString()
                      : 'Never'
                  }
                />
              </AnimatedCard>
            )}
          </View>
        ) : (
          <AnimatedCard delay={0}>
            <Markdown style={markdownStyles}>
              {skill.docs || 'No documentation available for this skill.'}
            </Markdown>
          </AnimatedCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroSection: { alignItems: 'center' },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actionSection: {},
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabRow: { flexDirection: 'row', gap: 4 },
  tabBtn: {},
});

