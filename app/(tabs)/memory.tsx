import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { ScreenHeader, LoadingState, ErrorState, EmptyState } from '../../src/components';
import { MemorySearch } from '../../src/components/MemorySearch';
import { DailyNotesCalendar } from '../../src/components/DailyNotesCalendar';
import { useMemoryFiles } from '../../src/hooks/useMemoryFiles';
import { MemoryFile } from '../../src/types';

type TabMode = 'files' | 'daily';

function formatRelativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getFileIcon(name: string): keyof typeof Ionicons.glyphMap {
  const lower = name.toLowerCase();
  if (lower.includes('soul')) return 'heart';
  if (lower.includes('memory')) return 'bulb';
  if (lower.includes('user')) return 'person';
  if (lower.includes('identity')) return 'finger-print';
  return 'document-text';
}

export default function Memory() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { files, loading, error, refresh, searchMemory, getDailyNotes } = useMemoryFiles();
  const [activeTab, setActiveTab] = useState<TabMode>('files');

  const handleSelectFile = useCallback(
    (name: string) => {
      router.push(`/memory/${encodeURIComponent(name)}`);
    },
    [router]
  );

  const handleSelectDailyNote = useCallback(
    (date: string) => {
      router.push(`/memory/${encodeURIComponent(`daily_${date}`)}`);
    },
    [router]
  );

  const renderFileItem = useCallback(
    ({ item }: { item: MemoryFile }) => {
      const snippet = item.content.slice(0, 80).replace(/\n/g, ' ');
      return (
        <Pressable
          onPress={() => handleSelectFile(item.name)}
          style={[
            styles.fileRow,
            {
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              padding: spacing.md,
              marginBottom: spacing.sm,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.fileIcon, { marginRight: spacing.md }]}>
            <Ionicons name={getFileIcon(item.name)} size={24} color={colors.accent} />
          </View>
          <View style={styles.fileInfo}>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.body.fontSize,
                fontWeight: '600',
              }}
            >
              {item.name}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.small.fontSize,
                marginTop: 2,
              }}
            >
              {formatRelativeDate(item.lastModified)}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.small.fontSize,
                marginTop: 4,
                lineHeight: 18,
              }}
              numberOfLines={2}
            >
              {snippet}{snippet.length >= 80 ? '…' : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      );
    },
    [colors, spacing, radius, typography, handleSelectFile]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <ScreenHeader title="Memory" />

        {/* Search */}
        <MemorySearch
          onSearch={searchMemory}
          onSelectResult={handleSelectFile}
        />

        {/* Tab switcher */}
        <View style={[styles.tabRow, { marginBottom: spacing.md }]}>
          {(['files', 'daily'] as TabMode[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
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
                <Text
                  style={{
                    color: isActive ? colors.accent : colors.textMuted,
                    fontSize: typography.body.fontSize,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {tab === 'files' ? 'Files' : 'Daily Notes'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Content */}
      {activeTab === 'files' ? (
        loading ? (
          <LoadingState message="Loading memory files…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : !files || files.length === 0 ? (
          <EmptyState icon="folder-open-outline" message="No memory files found" />
        ) : (
          <FlatList
            data={files}
            keyExtractor={(item) => item.name}
            renderItem={renderFileItem}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
            refreshing={loading}
            onRefresh={refresh}
          />
        )
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <DailyNotesCalendar
            getDailyNotes={getDailyNotes}
            onSelectNote={handleSelectDailyNote}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabBtn: {},
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  fileIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: { flex: 1 },
});

