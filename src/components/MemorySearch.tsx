import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { MemoryFile } from '../types';

interface MemorySearchProps {
  onSearch: (query: string) => Promise<MemoryFile[]>;
  onSelectResult: (fileName: string) => void;
}

export const MemorySearch: React.FC<MemorySearchProps> = ({
  onSearch,
  onSelectResult,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemoryFile[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await onSearch(query);
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
        setHasSearched(true);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onSearch]);

  const highlightSnippet = useCallback(
    (content: string) => {
      const maxLen = 120;
      const lowerQ = query.toLowerCase();
      const idx = content.toLowerCase().indexOf(lowerQ);
      let snippet: string;
      if (idx >= 0) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(content.length, idx + query.length + 80);
        snippet = (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
      } else {
        snippet = content.slice(0, maxLen) + (content.length > maxLen ? '…' : '');
      }
      return snippet;
    },
    [query]
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            marginBottom: spacing.md,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize: typography.body.fontSize,
              marginLeft: spacing.sm,
            },
          ]}
          placeholder="Search memory…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {searching && (
        <ActivityIndicator
          size="small"
          color={colors.accent}
          style={{ marginBottom: spacing.md }}
        />
      )}

      {hasSearched && !searching && results.length === 0 && query.trim() && (
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.body.fontSize,
            textAlign: 'center',
            marginTop: spacing.lg,
          }}
        >
          No results found
        </Text>
      )}

      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectResult(item.name)}
              style={[
                styles.resultItem,
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                },
              ]}
            >
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
                  marginTop: 4,
                  lineHeight: 18,
                }}
                numberOfLines={3}
              >
                {highlightSnippet(item.content)}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  searchBar: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1 },
  resultItem: {},
});

