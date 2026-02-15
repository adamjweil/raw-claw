import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { ChatSession } from '../types';

interface SessionTabsProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
}

export const SessionTabs: React.FC<SessionTabsProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleLongPress = useCallback(
    (session: ChatSession) => {
      Alert.alert(session.title, 'Choose an action', [
        {
          text: 'Rename',
          onPress: () => {
            setEditingId(session.id);
            setEditTitle(session.title);
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteSession(session.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [onDeleteSession]
  );

  const handleRenameSubmit = useCallback(() => {
    if (editingId && editTitle.trim()) {
      onRenameSession(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  }, [editingId, editTitle, onRenameSession]);

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.sm, gap: spacing.xs }]}
      >
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;

          if (editingId === session.id) {
            return (
              <TextInput
                key={session.id}
                style={[
                  styles.tab,
                  {
                    backgroundColor: colors.accent + '33',
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    color: colors.text,
                    fontSize: typography.small.fontSize,
                    minWidth: 80,
                  },
                ]}
                value={editTitle}
                onChangeText={setEditTitle}
                onSubmitEditing={handleRenameSubmit}
                onBlur={handleRenameSubmit}
                autoFocus
                selectTextOnFocus
              />
            );
          }

          return (
            <Pressable
              key={session.id}
              onPress={() => onSelectSession(session.id)}
              onLongPress={() => handleLongPress(session)}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? colors.accent + '33' : colors.surface,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderWidth: isActive ? 1 : 0,
                  borderColor: isActive ? colors.accent + '66' : 'transparent',
                },
              ]}
            >
              <Text
                style={{
                  color: isActive ? colors.accent : colors.textSecondary,
                  fontSize: typography.small.fontSize,
                  fontWeight: isActive ? '600' : '400',
                }}
                numberOfLines={1}
              >
                {session.title}
              </Text>
            </Pressable>
          );
        })}

        {/* New session button */}
        <Pressable
          onPress={onCreateSession}
          style={[
            styles.tab,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              paddingHorizontal: spacing.sm + 2,
              paddingVertical: spacing.sm,
              borderWidth: 1,
              borderColor: colors.border,
              borderStyle: 'dashed',
            },
          ]}
        >
          <Ionicons name="add" size={18} color={colors.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    maxWidth: 140,
  },
});

