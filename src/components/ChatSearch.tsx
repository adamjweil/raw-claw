import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Message } from '../types';

interface ChatSearchProps {
  messages: Message[];
  onSearchGateway?: (query: string) => Promise<Message[]>;
  onSelectResult: (messageId: string) => void;
  onClose: () => void;
}

function highlightText(text: string, query: string, highlightColor: string, textColor: string) {
  if (!query.trim()) {
    return <Text style={{ color: textColor }}>{text}</Text>;
  }
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <Text style={{ color: textColor }}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <Text key={i} style={{ backgroundColor: highlightColor, color: '#fff', fontWeight: '600' }}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

export const ChatSearch: React.FC<ChatSearchProps> = ({
  messages,
  onSearchGateway,
  onSelectResult,
  onClose,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [query, setQuery] = useState('');
  const [gatewayResults, setGatewayResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local search
  const localResults = query.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  // Merge local + gateway results, deduplicate by id
  const allResults = [...localResults];
  for (const gr of gatewayResults) {
    if (!allResults.find((m) => m.id === gr.id)) {
      allResults.push(gr);
    }
  }

  // Gateway search with debounce
  useEffect(() => {
    if (!query.trim() || !onSearchGateway) {
      setGatewayResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await onSearchGateway(query);
        setGatewayResults(results);
      } catch {
        // silent fail for gateway search
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onSearchGateway]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Search bar */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            margin: spacing.md,
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
          placeholder="Search messages…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <Pressable onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Results */}
      {query.trim() ? (
        <FlatList
          data={allResults}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectResult(item.id)}
              style={[
                styles.resultItem,
                {
                  borderBottomColor: colors.border,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                },
              ]}
            >
              <View style={styles.resultHeader}>
                <Text
                  style={{
                    color: item.role === 'user' ? colors.accent : colors.textMuted,
                    fontSize: typography.tiny.fontSize,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.role}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: typography.tiny.fontSize }}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </View>
              <View style={{ marginTop: 4 }}>
                {highlightText(
                  item.content.length > 150 ? item.content.slice(0, 150) + '…' : item.content,
                  query,
                  colors.accent,
                  colors.textSecondary
                )}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={{ color: colors.textMuted, fontSize: typography.body.fontSize }}>
                {searching ? 'Searching…' : 'No results found'}
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={{ color: colors.textMuted, fontSize: typography.body.fontSize }}>
            Type to search messages
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1 },
  resultItem: { borderBottomWidth: 1 },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
});

