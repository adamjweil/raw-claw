import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Markdown from '@ronradtke/react-native-markdown-display';
import { useTheme, monoFont } from '../../../src/theme';
import { MarkdownEditor } from '../../../src/components/MarkdownEditor';
import { useMemoryFiles } from '../../../src/hooks/useMemoryFiles';
import { MemoryFile } from '../../../src/types';

export default function MemoryFileViewer() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const { getFile, updateFile } = useMemoryFiles();

  const [file, setFile] = useState<MemoryFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const decodedName = decodeURIComponent(name || '');

  const loadFile = useCallback(async () => {
    if (!decodedName) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFile(decodedName);
      setFile(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load file';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [decodedName, getFile]);

  useEffect(() => {
    loadFile();
  }, [loadFile]);

  const handleSave = useCallback(
    async (content: string) => {
      const updated = await updateFile(decodedName, content);
      setFile(updated);
      setEditing(false);
    },
    [decodedName, updateFile]
  );

  const mdStyles = {
    body: { color: colors.textSecondary, fontSize: typography.body.fontSize, lineHeight: 24 },
    heading1: { color: colors.text, fontSize: 22, fontWeight: '700' as const, marginBottom: 8, marginTop: 16 },
    heading2: { color: colors.text, fontSize: 19, fontWeight: '700' as const, marginBottom: 6, marginTop: 14 },
    heading3: { color: colors.text, fontSize: 16, fontWeight: '600' as const, marginBottom: 4, marginTop: 12 },
    strong: { fontWeight: '700' as const, color: colors.text },
    em: { fontStyle: 'italic' as const },
    code_inline: {
      fontFamily: monoFont,
      backgroundColor: 'rgba(0,0,0,0.3)',
      color: colors.accent,
      paddingHorizontal: 4,
      borderRadius: 3,
      fontSize: 13,
    },
    code_block: {
      fontFamily: monoFont,
      backgroundColor: 'rgba(0,0,0,0.4)',
      color: '#e2e8f0',
      padding: 12,
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 20,
    },
    fence: {
      fontFamily: monoFont,
      backgroundColor: 'rgba(0,0,0,0.4)',
      color: '#e2e8f0',
      padding: 12,
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 20,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      paddingLeft: 12,
      marginLeft: 0,
      opacity: 0.85,
    },
    link: { color: colors.accent, textDecorationLine: 'underline' as const },
    list_item: { marginBottom: 4 },
    paragraph: { marginTop: 0, marginBottom: 10 },
  };

  if (editing && file) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <MarkdownEditor
          initialContent={file.content}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      </SafeAreaView>
    );
  }

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
            Memory
          </Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setEditing(true)}
            disabled={!file}
            hitSlop={8}
            style={{ marginRight: spacing.md, opacity: file ? 1 : 0.3 }}
          >
            <Ionicons name="create-outline" size={22} color={colors.accent} />
          </Pressable>
          <Pressable
            onPress={() => router.push(`/memory/${encodeURIComponent(decodedName)}/history`)}
            disabled={!file}
            hitSlop={8}
            style={{ opacity: file ? 1 : 0.3 }}
          >
            <Ionicons name="time-outline" size={22} color={colors.accent} />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>
            Loading…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={{ color: colors.error, marginTop: spacing.md }}>{error}</Text>
          <Pressable
            onPress={loadFile}
            style={[
              styles.retryBtn,
              {
                backgroundColor: colors.accent,
                borderRadius: radius.md,
                marginTop: spacing.lg,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      ) : file ? (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: typography.heading.fontSize + 4,
              fontWeight: '700',
              marginBottom: spacing.xs,
            }}
          >
            {file.name}
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.small.fontSize,
              marginBottom: spacing.lg,
            }}
          >
            Last modified {new Date(file.lastModified).toLocaleString()}
          </Text>
          <Markdown style={mdStyles}>{file.content}</Markdown>
        </ScrollView>
      ) : null}
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
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {},
});

