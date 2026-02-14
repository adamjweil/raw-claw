import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useStore } from '../../src/services/store';
import { Message } from '../../src/types';

const C = { bg: '#0a0a0f', surface: '#1a1a2e', card: '#16213e', accent: '#0ea5e9' };

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderContent(text: string) {
  // Basic: bold **text**, code `text`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <Text key={i} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <Text key={i} style={s.code}>{part.slice(1, -1)}</Text>;
    return <Text key={i}>{part}</Text>;
  });
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <Animated.View entering={FadeIn.duration(200)} style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
      <Text style={[s.msgText, isUser && { color: '#fff' }]}>{renderContent(msg.content)}</Text>
      <Text style={[s.time, isUser && { color: 'rgba(255,255,255,0.5)' }]}>{formatTime(msg.timestamp)}</Text>
    </Animated.View>
  );
}

export default function Chat() {
  const { state, dispatch } = useStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (state.client) {
      const unsub = state.client.onMessage((msg) => {
        dispatch({ type: 'ADD_MESSAGE', message: msg });
      });
      return unsub;
    }
  }, [state.client]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    dispatch({ type: 'ADD_MESSAGE', message: userMsg });
    setSending(true);
    try {
      if (state.client) {
        const reply = await state.client.sendMessage(text);
        dispatch({ type: 'ADD_MESSAGE', message: reply });
      } else {
        // Placeholder response
        const reply: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Connect to a gateway in **Settings** to start chatting.',
          timestamp: Date.now(),
        };
        dispatch({ type: 'ADD_MESSAGE', message: reply });
      }
    } catch {
      dispatch({
        type: 'ADD_MESSAGE',
        message: { id: (Date.now() + 1).toString(), role: 'assistant', content: '⚠️ Failed to send message.', timestamp: Date.now() },
      });
    } finally {
      setSending(false);
    }
  }, [input, sending, state.client]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Chat</Text>
        <View style={[s.dot, state.connected ? s.dotOn : s.dotOff]} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={state.messages}
          inverted
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble msg={item} />}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color="#333" />
              <Text style={s.emptyText}>Send a message to get started</Text>
            </View>
          }
        />
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder="Message your AI…"
            placeholderTextColor="#555"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            returnKeyType="send"
            multiline
            maxLength={4000}
          />
          <Pressable onPress={send} style={[s.sendBtn, (!input.trim() || sending) && { opacity: 0.3 }]} disabled={!input.trim() || sending}>
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOn: { backgroundColor: '#10b981' },
  dotOff: { backgroundColor: '#ef4444' },
  list: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 18, marginBottom: 10 },
  bubbleUser: { backgroundColor: C.accent, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: C.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  msgText: { color: '#ddd', fontSize: 15, lineHeight: 22 },
  code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 4, borderRadius: 3, fontSize: 13 },
  time: { color: '#666', fontSize: 11, marginTop: 6, alignSelf: 'flex-end' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120, transform: [{ scaleY: -1 }] },
  emptyText: { color: '#444', marginTop: 12, fontSize: 15 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 16, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  input: { flex: 1, backgroundColor: C.card, color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, maxHeight: 100 },
  sendBtn: { backgroundColor: C.accent, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});
