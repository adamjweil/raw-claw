import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/theme';
import { DiffViewer } from '../../../src/components/DiffViewer';
import { useMemoryFiles } from '../../../src/hooks/useMemoryFiles';
import { MemoryDiff } from '../../../src/types';

export default function MemoryFileHistory() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const { getDiffs } = useMemoryFiles();

  const [diffs, setDiffs] = useState<MemoryDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const decodedName = decodeURIComponent(name || '');

  const loadDiffs = useCallback(async () => {
    if (!decodedName) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDiffs(decodedName);
      setDiffs(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load history';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [decodedName, getDiffs]);

  useEffect(() => {
    loadDiffs();
  }, [loadDiffs]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
          <Text
            style={{ color: colors.accent, fontSize: typography.body.fontSize, marginLeft: 4 }}
          >
            Back
          </Text>
        </Pressable>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.heading.fontSize,
            fontWeight: '600',
          }}
        >
          History
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* File name */}
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.body.fontSize,
            fontWeight: '600',
          }}
        >
          {decodedName}
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.small.fontSize,
            marginTop: 2,
          }}
        >
          {diffs.length} change{diffs.length !== 1 ? 's' : ''} recorded
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>
            Loading history…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={{ color: colors.error, marginTop: spacing.md }}>{error}</Text>
          <Pressable
            onPress={loadDiffs}
            style={[
              styles.retryBtn,
              {
                backgroundColor: colors.accent,
                marginTop: spacing.lg,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
                borderRadius: 8,
              },
            ]}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <DiffViewer diffs={diffs} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 60 },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtn: {},
});

