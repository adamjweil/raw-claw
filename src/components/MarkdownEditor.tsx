import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, monoFont } from '../theme';

interface MarkdownEditorProps {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const isDirty = content !== initialContent;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(content);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save';
      Alert.alert('Save Error', message);
    } finally {
      setSaving(false);
    }
  }, [content, onSave]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onCancel },
        ]
      );
    } else {
      onCancel();
    }
  }, [isDirty, onCancel]);

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          },
        ]}
      >
        <Pressable onPress={handleCancel} hitSlop={8}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.body.fontSize }}>
            Cancel
          </Text>
        </Pressable>

        <View style={styles.toolbarCenter}>
          {isDirty && (
            <View
              style={[
                styles.unsavedDot,
                { backgroundColor: colors.warning, marginRight: spacing.xs },
              ]}
            />
          )}
          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.small.fontSize,
            }}
          >
            {isDirty ? 'Unsaved changes' : 'Editing'}
          </Text>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={!isDirty || saving}
          hitSlop={8}
          style={{ opacity: isDirty && !saving ? 1 : 0.4 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text
              style={{
                color: colors.accent,
                fontSize: typography.body.fontSize,
                fontWeight: '600',
              }}
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>

      {/* Editor */}
      <TextInput
        style={[
          styles.editor,
          {
            color: colors.text,
            fontFamily: monoFont,
            fontSize: 14,
            lineHeight: 22,
            padding: spacing.md,
            backgroundColor: colors.bg,
          },
        ]}
        value={content}
        onChangeText={setContent}
        multiline
        textAlignVertical="top"
        autoCapitalize="none"
        autoCorrect={false}
        scrollEnabled
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  toolbarCenter: { flexDirection: 'row', alignItems: 'center' },
  unsavedDot: { width: 8, height: 8, borderRadius: 4 },
  editor: { flex: 1 },
});

