import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../src/services/store';
import { useTheme } from '../../src/theme';
import { EmptyState } from '../../src/components';
import { MessageBubble } from '../../src/components/MessageBubble';

import { ChatSearch } from '../../src/components/ChatSearch';
import { CommandPalette, SlashCommand } from '../../src/components/CommandPalette';
import { AttachmentPicker, PickedFile } from '../../src/components/AttachmentPicker';
import { AttachmentPreview } from '../../src/components/AttachmentPreview';

import { useVoiceInput } from '../../src/hooks/useVoiceInput';
import { useTextToSpeech } from '../../src/hooks/useTextToSpeech';
import { Message } from '../../src/types';

type MessageFilter = 'all' | 'alerts' | 'automated' | 'user';

const FILTER_OPTIONS: { key: MessageFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'automated', label: 'Automated' },
  { key: 'user', label: 'User' },
];

export default function Chat() {
  const { state, dispatch } = useStore();
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();

  // Chat input state
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Feature states
  const [showSearch, setShowSearch] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<PickedFile[]>([]);
  const [activeFilter, setActiveFilter] = useState<MessageFilter>('all');

  // Slash command detection
  const showCommandPalette = input.startsWith('/');
  const commandFilter = showCommandPalette ? input.slice(1) : '';

  const activeSessionId = state.activeSessionId;

  // Voice hooks
  const { isRecording, startRecording, stopRecording } = useVoiceInput();
  const { speakingMessageId, speak, stop: stopSpeech } = useTextToSpeech();

  // When a sessionId param is supplied (e.g. from the Home activity feed),
  // set it as the active session and load its chat history.
  useEffect(() => {
    if (params.sessionId && params.sessionId !== state.activeSessionId) {
      dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: params.sessionId });

      // Load session messages from gateway
      if (state.client) {
        state.client
          .getChatHistory(params.sessionId)
          .then((messages) => {
            dispatch({ type: 'SET_MESSAGES', messages });
          })
          .catch(() => {
            // Silently fail — user can still send new messages
          });
      }
    }
  }, [params.sessionId, state.client, state.activeSessionId, dispatch]);

  // Listen for incoming WebSocket messages
  useEffect(() => {
    if (state.client) {
      const unsub = state.client.onMessage((msg) => {
        dispatch({ type: 'ADD_MESSAGE', message: msg });
      });
      return unsub;
    }
  }, [state.client, dispatch]);

  // Filter messages based on active session and filter
  const filteredMessages = useMemo(() => {
    let msgs = state.messages;

    // Filter by session if active
    if (activeSessionId) {
      msgs = msgs.filter(
        (m) => !m.sessionId || m.sessionId === activeSessionId
      );
    }

    // Filter by category
    if (activeFilter !== 'all') {
      msgs = msgs.filter((m) => {
        const cat = m.category || (m.role === 'user' ? 'user' : 'assistant');
        switch (activeFilter) {
          case 'alerts':
            return cat === 'alert';
          case 'automated':
            return cat === 'automation';
          case 'user':
            return cat === 'user';
          default:
            return true;
        }
      });
    }

    return msgs;
  }, [state.messages, activeSessionId, activeFilter]);

  // Send message
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setAttachedFiles([]);

    setSending(true);
    const now = Date.now();
    const userMsg: Message = {
      id: `user-${now}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      content: text,
      timestamp: now,
      category: 'user',
      sessionId: activeSessionId || undefined,
    };
    dispatch({ type: 'ADD_MESSAGE', message: userMsg });
    dispatch({ type: 'SET_THINKING', thinking: true });

    try {
      if (state.client) {
        const reply = await state.client.sendMessage(text, activeSessionId || undefined);
        dispatch({ type: 'ADD_MESSAGE', message: reply });
      } else {
        const reply: Message = {
          id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'assistant',
          content: 'Connect to a gateway in **Settings** to start chatting.',
          timestamp: Date.now(),
        };
        dispatch({ type: 'ADD_MESSAGE', message: reply });
      }
    } catch (err: unknown) {
      const errMsg =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : String(err);
      console.warn('[Chat] sendMessage error:', errMsg, err);
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'assistant',
          content: `⚠️ Failed to send message: ${errMsg}`,
          timestamp: Date.now(),
          category: 'alert',
        },
      });
    } finally {
      setSending(false);
      dispatch({ type: 'SET_THINKING', thinking: false });
    }
  }, [input, sending, state.client, dispatch, activeSessionId]);

  // Slash command handler
  const handleCommandSelect = useCallback(
    (cmd: SlashCommand) => {
      setInput('');
      if (cmd.command === '/clear') {
        dispatch({ type: 'SET_MESSAGES', messages: [] });
        return;
      }
      if (cmd.command === '/cron') {
        router.push('/(tabs)/automations');
        return;
      }
      if (cmd.command === '/skills') {
        router.push('/(tabs)/skills');
        return;
      }
      // For other commands, send as message
      const text = cmd.command;
      setInput(text);
      // Auto-send after a tick
      setTimeout(() => {
        setInput('');
        const cmdNow = Date.now();
        const userMsg: Message = {
          id: `cmd-${cmdNow}-${Math.random().toString(36).slice(2, 7)}`,
          role: 'user',
          content: text,
          timestamp: cmdNow,
          category: 'user',
          sessionId: activeSessionId || undefined,
        };
        dispatch({ type: 'ADD_MESSAGE', message: userMsg });
        if (state.client) {
          dispatch({ type: 'SET_THINKING', thinking: true });
          state.client
            .sendMessage(text, activeSessionId || undefined)
            .then((reply) => {
              dispatch({ type: 'ADD_MESSAGE', message: reply });
            })
            .catch(() => {
              dispatch({
                type: 'ADD_MESSAGE',
                message: {
                  id: `cmd-err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  role: 'assistant',
                  content: '⚠️ Command failed.',
                  timestamp: Date.now(),
                  category: 'alert',
                },
              });
            })
            .finally(() => {
              dispatch({ type: 'SET_THINKING', thinking: false });
            });
        }
      }, 50);
    },
    [dispatch, state.client, activeSessionId, router]
  );

  // Voice recording handler
  const handleVoicePress = useCallback(async () => {
    if (isRecording) {
      const uri = await stopRecording();
      if (uri) {
        // For now, add a placeholder noting the voice file
        // In a real app, this would be sent to gateway for transcription
        setInput((prev) => prev + '[Voice message recorded]');
      }
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Speak handler
  const handleSpeak = useCallback(
    (text: string, messageId?: string) => {
      if (messageId) {
        speak(text, messageId);
      }
    },
    [speak]
  );

  // Search result handler
  const handleSearchResult = useCallback(
    (_messageId: string) => {
      setShowSearch(false);
      // Could scroll to message in list
    },
    []
  );

  // Gateway search handler
  const searchGateway = useCallback(
    async (query: string) => {
      if (!state.client) return [];
      return state.client.searchMessages(query);
    },
    [state.client]
  );

  // Attachment handlers
  const handleFilesPicked = useCallback((files: PickedFile[]) => {
    setAttachedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Show search mode
  if (showSearch) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <ChatSearch
          messages={state.messages}
          onSearchGateway={searchGateway}
          onSelectResult={handleSearchResult}
          onClose={() => setShowSearch(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { padding: spacing.lg, paddingBottom: spacing.sm + 2 }]}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                router.push('/(tabs)');
              }}
              hitSlop={8}
            >
              <Ionicons name="home-outline" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: typography.title.fontSize,
                fontWeight: typography.title.fontWeight,
              },
            ]}
          >
            Chat
          </Text>
          <View style={styles.headerRight}>
            <Pressable onPress={() => setShowSearch(true)} hitSlop={8} style={{ marginRight: spacing.md }}>
              <Ionicons name="search" size={22} color={colors.textSecondary} />
            </Pressable>
            <View
              style={[
                styles.dot,
                { backgroundColor: state.connected ? colors.success : colors.error },
              ]}
            />
          </View>
        </View>

        {/* Filter pills */}
        <View style={[styles.filterRow, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
          {FILTER_OPTIONS.map((opt) => {
            const isActive = activeFilter === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setActiveFilter(opt.key)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive ? colors.accent + '22' : colors.surface,
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs + 2,
                    borderWidth: isActive ? 1 : 0,
                    borderColor: colors.accent + '44',
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
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Message list */}
        <FlatList
          ref={listRef}
          data={filteredMessages}
          inverted
          keyExtractor={(m, index) => m.id ?? `msg-${index}`}
          renderItem={({ item }) => (
            <MessageBubble
              msg={item}
              onSpeak={(text) => handleSpeak(text, item.id)}
              isSpeaking={speakingMessageId === item.id}
            />
          )}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.list, { padding: spacing.md, paddingBottom: spacing.sm }]}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="chatbubble-ellipses-outline"
                message="Send a message to get started"
              />
            </View>
          }
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        {/* Thinking indicator */}
        {state.thinking && (
          <View style={[styles.thinkingBar, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }]}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.small.fontSize,
                marginLeft: spacing.sm,
              }}
            >
              Thinking…
            </Text>
          </View>
        )}

        {/* Command palette */}
        {showCommandPalette && (
          <CommandPalette filter={commandFilter} onSelect={handleCommandSelect} />
        )}

        {/* Attachment picker */}
        {showAttachmentPicker && (
          <AttachmentPicker
            onFilesPicked={handleFilesPicked}
            onClose={() => setShowAttachmentPicker(false)}
          />
        )}

        {/* Attachment previews */}
        {attachedFiles.length > 0 && (
          <AttachmentPreview files={attachedFiles} onRemove={handleRemoveAttachment} />
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.surface,
              padding: spacing.md - 4,
              paddingBottom: spacing.md,
              borderTopColor: colors.border,
            },
          ]}
        >
          {/* Attachment button */}
          <Pressable
            onPress={() => setShowAttachmentPicker(!showAttachmentPicker)}
            hitSlop={8}
            style={{ marginRight: spacing.sm }}
          >
            <Ionicons
              name="attach"
              size={24}
              color={showAttachmentPicker ? colors.accent : colors.textMuted}
            />
          </Pressable>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderRadius: radius.xl,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md - 4,
                fontSize: typography.body.fontSize,
              },
            ]}
            placeholder="Message your AI…"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            returnKeyType="send"
            multiline
            maxLength={4000}
          />

          {/* Voice / Send button */}
          {input.trim() ? (
            <Pressable
              onPress={send}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: colors.accent,
                  marginLeft: spacing.sm,
                },
                sending && { opacity: 0.3 },
              ]}
              disabled={sending}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleVoicePress}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: isRecording ? colors.error : colors.card,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={20}
                color={isRecording ? '#fff' : colors.textMuted}
              />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', minWidth: 60 },
  headerRight: { flexDirection: 'row', alignItems: 'center', minWidth: 60, justifyContent: 'flex-end' },
  title: { textAlign: 'center', flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: {},
  list: {},
  emptyWrap: {
    flex: 1,
    paddingTop: 120,
    transform: [{ scaleY: -1 }],
  },
  thinkingBar: { flexDirection: 'row', alignItems: 'center' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
  },
  input: { flex: 1, maxHeight: 100 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
