import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useStore } from '../src/services/store';
import { useTheme, ThemePreference } from '../src/theme';
import { useGatewayStatus } from '../src/hooks';
import { GatewayClient } from '../src/services/gateway';
import { Card, Row } from '../src/components';
import { ModelPicker } from '../src/components/ModelPicker';
import { NotificationSettingsCard } from '../src/components/NotificationSettingsCard';
import { QuietHoursPicker } from '../src/components/QuietHoursPicker';

// ─── Section Header ─────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.sectionHeader, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text
        style={[
          styles.sectionTitle,
          {
            color: colors.text,
            fontSize: typography.heading.fontSize,
            fontWeight: typography.heading.fontWeight,
            marginLeft: spacing.sm,
          },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

// ─── Theme Selector ─────────────────────────────────────────────────

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'phone-portrait' },
];

function ThemeSelector() {
  const { colors, spacing, radius, typography, preference, setThemePreference } = useTheme();

  return (
    <View style={[styles.themeRow, { gap: spacing.sm }]}>
      {THEME_OPTIONS.map((opt) => {
        const isActive = preference === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[
              styles.themeOption,
              {
                backgroundColor: isActive ? colors.accent + '22' : colors.surface,
                borderColor: isActive ? colors.accent : colors.border,
                borderRadius: radius.md,
                paddingVertical: spacing.sm + 2,
                paddingHorizontal: spacing.md,
              },
            ]}
            onPress={() => setThemePreference(opt.value)}
            accessibilityRole="button"
            accessibilityLabel={`${opt.label} theme`}
            accessibilityState={{ selected: isActive }}
          >
            <Ionicons
              name={opt.icon}
              size={18}
              color={isActive ? colors.accent : colors.textMuted}
            />
            <Text
              style={[
                styles.themeLabel,
                {
                  color: isActive ? colors.accent : colors.textSecondary,
                  fontSize: typography.small.fontSize,
                  fontWeight: isActive ? '700' : '500',
                  marginTop: spacing.xs,
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Settings Screen ────────────────────────────────────────────────

export default function Settings() {
  const { state, saveConfig } = useStore();
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const gatewayStatus = useGatewayStatus();

  const [url, setUrl] = useState(state.config.url);
  const [token, setToken] = useState(state.config.token);
  const [testing, setTesting] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  useEffect(() => {
    setUrl(state.config.url);
    setToken(state.config.token);
  }, [state.config]);

  const testConnection = useCallback(async () => {
    setTesting(true);
    try {
      const client = new GatewayClient(url, token);
      const ok = await client.testConnection();
      Alert.alert(
        ok ? '✅ Connected' : '❌ Failed',
        ok ? 'Gateway is reachable.' : 'Could not reach gateway.'
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('❌ Error', msg);
    } finally {
      setTesting(false);
    }
  }, [url, token]);

  const save = useCallback(async () => {
    await saveConfig({ url, token });
    Alert.alert('Saved', 'Gateway configuration saved.');
    router.back();
  }, [url, token, saveConfig, router]);

  // Derive model info
  const currentModel = gatewayStatus.data?.model || state.status?.model || '—';
  const gatewayVersion = gatewayStatus.data?.version || state.status?.version || '—';
  const appVersion = Constants.expoConfig?.version || '0.1.0';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: spacing.lg, paddingBottom: 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gateway Connection ─────────────────────────────── */}
        <SectionHeader icon="server" title="Gateway Connection" />
        <Card>
          <Text
            style={[
              styles.label,
              {
                color: colors.textMuted,
                fontSize: typography.small.fontSize,
                fontWeight: typography.small.fontWeight,
                marginBottom: spacing.sm,
              },
            ]}
          >
            GATEWAY URL
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: typography.body.fontSize,
                borderColor: colors.border,
              },
            ]}
            value={url}
            onChangeText={setUrl}
            placeholder="http://localhost:3000"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Gateway URL"
          />

          <Text
            style={[
              styles.label,
              {
                color: colors.textMuted,
                fontSize: typography.small.fontSize,
                fontWeight: typography.small.fontWeight,
                marginBottom: spacing.sm,
                marginTop: spacing.lg,
              },
            ]}
          >
            GATEWAY TOKEN
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderRadius: radius.md,
                padding: spacing.md,
                fontSize: typography.body.fontSize,
                borderColor: colors.border,
              },
            ]}
            value={token}
            onChangeText={setToken}
            placeholder="Enter token"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Gateway Token"
          />

          <View style={[styles.buttonRow, { marginTop: spacing.lg, gap: spacing.sm }]}>
            <Pressable
              style={[
                styles.testBtn,
                {
                  padding: spacing.md,
                  borderRadius: radius.md,
                  borderColor: colors.accent + '44',
                  flex: 1,
                },
              ]}
              onPress={testConnection}
              disabled={testing}
              accessibilityRole="button"
              accessibilityLabel="Test connection"
            >
              {testing ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <>
                  <Ionicons name="wifi" size={18} color={colors.accent} />
                  <Text style={[styles.testText, { color: colors.accent }]}>Test</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.accent,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  flex: 1,
                },
              ]}
              onPress={save}
              accessibilityRole="button"
              accessibilityLabel="Save configuration"
            >
              <Ionicons name="save" size={18} color="#fff" />
              <Text style={[styles.saveText, { color: '#fff', fontSize: typography.body.fontSize, fontWeight: '600' }]}>
                Save
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* ── Model ──────────────────────────────────────────── */}
        <SectionHeader icon="hardware-chip" title="Model" />
        <Card>
          <Row label="Current Model" value={currentModel} />
          <Pressable
            style={[
              styles.settingsRow,
              { paddingVertical: spacing.md, borderBottomColor: colors.border },
            ]}
            onPress={() => setShowModelPicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Change model"
          >
            <Text style={[styles.settingsRowLabel, { color: colors.accent, fontSize: typography.body.fontSize }]}>
              Change Model
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </Card>

        {/* ── Appearance ─────────────────────────────────────── */}
        <SectionHeader icon="color-palette" title="Appearance" />
        <Card>
          <ThemeSelector />
        </Card>

        {/* ── Notifications ──────────────────────────────────── */}
        <SectionHeader icon="notifications" title="Notifications" />
        <Card>
          <NotificationSettingsCard />
        </Card>

        <Card title="Quiet Hours" icon="moon">
          <QuietHoursPicker />
        </Card>

        {/* ── About ──────────────────────────────────────────── */}
        <SectionHeader icon="information-circle" title="About" />
        <Card>
          <Row label="App Version" value={appVersion} />
          <Row label="Gateway Version" value={gatewayVersion} />
          <Row label="Build" value={Constants.expoConfig?.extra?.buildNumber || '1'} />

          <Pressable
            style={[
              styles.linkRow,
              { paddingVertical: spacing.md, borderBottomColor: colors.border },
            ]}
            onPress={() => Linking.openURL('https://github.com/adamweil/paw')}
            accessibilityRole="link"
            accessibilityLabel="View on GitHub"
          >
            <Ionicons name="logo-github" size={18} color={colors.textSecondary} />
            <Text
              style={[
                styles.linkText,
                { color: colors.textSecondary, fontSize: typography.body.fontSize, marginLeft: spacing.sm },
              ]}
            >
              View on GitHub
            </Text>
            <Ionicons name="open-outline" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
          </Pressable>

          <Pressable
            style={[styles.linkRow, { paddingVertical: spacing.md, borderBottomColor: colors.border }]}
            onPress={() => Linking.openURL('https://github.com/adamweil/paw/issues')}
            accessibilityRole="link"
            accessibilityLabel="Report an issue"
          >
            <Ionicons name="bug" size={18} color={colors.textSecondary} />
            <Text
              style={[
                styles.linkText,
                { color: colors.textSecondary, fontSize: typography.body.fontSize, marginLeft: spacing.sm },
              ]}
            >
              Report Issue
            </Text>
            <Ionicons name="open-outline" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
          </Pressable>
        </Card>
      </ScrollView>

      <ModelPicker visible={showModelPicker} onClose={() => setShowModelPicker(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {},
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  testText: { fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: {},
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  settingsRowLabel: {
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  linkText: {
    fontWeight: '500',
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
  },
  themeLabel: {},
});
