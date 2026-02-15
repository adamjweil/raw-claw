import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useClawHub } from '../hooks/useClawHub';
import { Skill } from '../types';

const COLS = 3;
const GAP = 12;
const PAD = 20;
const TILE = (Dimensions.get('window').width - PAD * 2 - GAP * (COLS - 1)) / COLS;

const CATEGORIES = ['All', 'Communication', 'Productivity', 'Smart Home', 'Developer'];

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  communication: 'chatbubbles',
  productivity: 'briefcase',
  'smart home': 'home',
  developer: 'code-slash',
};

interface ClawHubBrowserProps {
  onNavigateToSkill: (skill: Skill) => void;
  onInstalled?: () => void;
}

export const ClawHubBrowser: React.FC<ClawHubBrowserProps> = ({
  onNavigateToSkill,
  onInstalled,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const { skills, loading, error, search, install, installing } = useClawHub();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    search(undefined, undefined);
  }, [search]);

  const handleSearch = useCallback(() => {
    search(query || undefined, category === 'All' ? undefined : category.toLowerCase());
  }, [search, query, category]);

  useEffect(() => {
    const debounce = setTimeout(handleSearch, 400);
    return () => clearTimeout(debounce);
  }, [query, category, handleSearch]);

  const handleInstall = useCallback(
    async (skill: Skill) => {
      Alert.alert(
        'Install Skill',
        `Install "${skill.name}"?\n\n${skill.description}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Install',
            onPress: async () => {
              const success = await install(skill.id);
              if (success) {
                Alert.alert('Installed', `${skill.name} has been installed successfully.`);
                onInstalled?.();
              } else {
                Alert.alert('Error', `Failed to install ${skill.name}. Please try again.`);
              }
            },
          },
        ]
      );
    },
    [install, onInstalled]
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View
        style={[
          styles.searchRow,
          {
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            marginBottom: spacing.md,
            borderWidth: 1,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[
            styles.searchInput,
            {
              color: colors.text,
              fontSize: typography.body.fontSize,
              marginLeft: spacing.sm,
            },
          ]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search ClawHub..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: spacing.md }}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = category === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive ? colors.accent + '22' : colors.card,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs + 2,
                  borderWidth: 1,
                  borderColor: isActive ? colors.accent + '66' : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: isActive ? colors.accent : colors.textMuted,
                  fontSize: typography.small.fontSize,
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.error} />
          <Text
            style={{
              color: colors.textMuted,
              marginTop: spacing.sm,
              fontSize: typography.body.fontSize,
            }}
          >
            {error}
          </Text>
          <Pressable
            onPress={handleSearch}
            style={{ marginTop: spacing.md }}
          >
            <Text style={{ color: colors.accent, fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      ) : skills.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-outline" size={36} color={colors.textMuted + '66'} />
          <Text
            style={{
              color: colors.textMuted,
              marginTop: spacing.sm,
              fontSize: typography.body.fontSize,
            }}
          >
            {query ? 'No skills found' : 'Browse the ClawHub catalog'}
          </Text>
        </View>
      ) : (
        <View style={[styles.grid, { gap: GAP }]}>
          {skills.map((skill) => (
            <Pressable
              key={skill.id}
              style={[
                styles.tile,
                {
                  width: TILE,
                  height: TILE + 20,
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  borderColor: colors.border,
                  opacity: installing === skill.id ? 0.5 : 1,
                },
              ]}
              onPress={() => onNavigateToSkill(skill)}
            >
              {installing === skill.id && (
                <ActivityIndicator
                  size="small"
                  color={colors.accent}
                  style={styles.installSpinner}
                />
              )}
              <Ionicons
                name={
                  skill.icon && (skill.icon as string) in Ionicons.glyphMap
                    ? (skill.icon as keyof typeof Ionicons.glyphMap)
                    : 'extension-puzzle'
                }
                size={26}
                color={colors.accent}
              />
              <Text
                style={[
                  styles.tileName,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {skill.name}
              </Text>
              <View
                style={[
                  styles.installBadge,
                  {
                    backgroundColor: colors.info + '22',
                    borderRadius: radius.sm,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  },
                ]}
              >
                <Text style={{ color: colors.info, fontSize: 10, fontWeight: '600' }}>
                  Install
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  searchInput: { flex: 1, height: 44, padding: 0 },
  pill: {},
  centered: { alignItems: 'center', paddingVertical: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
  },
  tileName: { fontSize: 11, fontWeight: '600', textAlign: 'center', paddingHorizontal: 4 },
  installBadge: {},
  installSpinner: { position: 'absolute', top: 8, right: 8 },
});

