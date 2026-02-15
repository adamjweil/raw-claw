import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, monoFont } from '../theme';
import { Message } from '../types';
import { ToolCallCard } from './ToolCallCard';

interface MessageBubbleProps {
  msg: Message;
  style?: ViewStyle;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
}

function formatTime(ts: number | string | undefined) {
  if (ts == null) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  msg,
  style,
  onSpeak,
  isSpeaking,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const category = msg.category || (msg.role === 'user' ? 'user' : 'assistant');
  const isUser = category === 'user';
  const isSystem = category === 'system';
  const isAlert = category === 'alert';
  const isAutomation = category === 'automation';

  // System messages — centered muted text, no bubble
  if (isSystem) {
    return (
      <View style={[styles.systemWrap, { marginBottom: spacing.sm + 2 }, style]}>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.small.fontSize,
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          {msg.content}
        </Text>
      </View>
    );
  }

  const bubbleBg = isUser
    ? colors.accent
    : isAlert
    ? 'rgba(239, 68, 68, 0.15)'
    : isAutomation
    ? 'transparent'
    : colors.card;

  const bubbleBorder = isAutomation
    ? { borderWidth: 1, borderColor: colors.border }
    : isAlert
    ? { borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }
    : {};

  const textColor = isUser ? '#fff' : colors.textSecondary;

  const mdStyles = {
    body: { color: textColor, fontSize: typography.body.fontSize, lineHeight: 22 },
    heading1: { color: isUser ? '#fff' : colors.text, fontSize: 20, fontWeight: '700' as const, marginBottom: 8 },
    heading2: { color: isUser ? '#fff' : colors.text, fontSize: 18, fontWeight: '700' as const, marginBottom: 6 },
    heading3: { color: isUser ? '#fff' : colors.text, fontSize: 16, fontWeight: '600' as const, marginBottom: 4 },
    strong: { fontWeight: '700' as const, color: isUser ? '#fff' : colors.text },
    em: { fontStyle: 'italic' as const },
    code_inline: {
      fontFamily: monoFont,
      backgroundColor: isUser ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)',
      color: isUser ? '#fff' : colors.accent,
      paddingHorizontal: 4,
      borderRadius: 3,
      fontSize: 13,
    },
    code_block: {
      fontFamily: monoFont,
      backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)',
      color: isUser ? '#ddd' : '#e2e8f0',
      padding: 12,
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 20,
    },
    fence: {
      fontFamily: monoFont,
      backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)',
      color: isUser ? '#ddd' : '#e2e8f0',
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
    table: { borderWidth: 1, borderColor: colors.border },
    th: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 6 },
    td: { padding: 6, borderWidth: 1, borderColor: colors.border },
    tr: { borderBottomWidth: 1, borderColor: colors.border },
    link: { color: colors.accent, textDecorationLine: 'underline' as const },
    list_item: { marginBottom: 4 },
    bullet_list: { marginBottom: 8 },
    ordered_list: { marginBottom: 8 },
    paragraph: { marginTop: 0, marginBottom: 8 },
  };

  const categoryIcon = isAlert ? 'warning' : isAutomation ? 'hardware-chip' : undefined;

  return (
    <View
      style={[
        styles.bubble,
        {
          backgroundColor: bubbleBg,
          borderRadius: radius.xl - 2,
          padding: spacing.md - 2,
          marginBottom: spacing.sm + 2,
          ...bubbleBorder,
        },
        isUser
          ? { alignSelf: 'flex-end', borderBottomRightRadius: 4 }
          : { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
        style,
      ]}
    >
      {categoryIcon && (
        <View style={[styles.categoryRow, { marginBottom: spacing.xs }]}>
          <Ionicons
            name={categoryIcon as keyof typeof Ionicons.glyphMap}
            size={14}
            color={isAlert ? colors.error : colors.accent}
          />
          <Text
            style={{
              color: isAlert ? colors.error : colors.accent,
              fontSize: typography.tiny.fontSize,
              fontWeight: '600',
              marginLeft: 4,
              textTransform: 'uppercase',
            }}
          >
            {isAlert ? 'Alert' : 'Automated'}
          </Text>
        </View>
      )}

      {isUser ? (
        <Text style={[styles.msgText, { color: '#fff', fontSize: typography.body.fontSize }]}>
          {msg.content}
        </Text>
      ) : (
        <Markdown style={mdStyles}>{String(msg.content ?? '')}</Markdown>
      )}

      {/* Tool calls */}
      {msg.toolCalls && msg.toolCalls.length > 0 && (
        <ToolCallCard toolCalls={msg.toolCalls} />
      )}

      {/* Attachment thumbnails */}
      {msg.attachments && msg.attachments.length > 0 && (
        <View style={[styles.attachmentsRow, { marginTop: spacing.sm }]}>
          {msg.attachments.map((att) => (
            <View
              key={att.id}
              style={[
                styles.attachChip,
                { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.sm },
              ]}
            >
              <Ionicons
                name={att.type.startsWith('image/') ? 'image-outline' : 'document-outline'}
                size={14}
                color={colors.textMuted}
              />
              <Text
                style={{ color: colors.textMuted, fontSize: 12, marginLeft: 4 }}
                numberOfLines={1}
              >
                {att.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footerRow}>
        <Text
          style={[
            styles.time,
            { color: isUser ? 'rgba(255,255,255,0.5)' : colors.textMuted },
          ]}
        >
          {formatTime(msg.timestamp)}
        </Text>
        {!isUser && onSpeak && (
          <Pressable onPress={() => onSpeak(msg.content)} hitSlop={8}>
            <Ionicons
              name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
              size={16}
              color={isSpeaking ? colors.accent : colors.textMuted}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%' },
  msgText: { lineHeight: 22 },
  time: { fontSize: 11, marginTop: 6 },
  systemWrap: { alignItems: 'center', paddingHorizontal: 24 },
  categoryRow: { flexDirection: 'row', alignItems: 'center' },
  attachmentsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  attachChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

