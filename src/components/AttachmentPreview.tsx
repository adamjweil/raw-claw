import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { PickedFile } from './AttachmentPicker';

interface AttachmentPreviewProps {
  files: PickedFile[];
  onRemove: (index: number) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  files,
  onRemove,
}) => {
  const { colors, spacing, radius } = useTheme();

  if (files.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
          borderTopColor: colors.border,
        },
      ]}
    >
      {files.map((file, idx) => {
        const isImage = file.type.startsWith('image/');
        return (
          <View
            key={`${file.name}-${idx}`}
            style={[
              styles.chip,
              {
                backgroundColor: colors.card,
                borderRadius: radius.sm,
                padding: spacing.sm,
              },
            ]}
          >
            {isImage ? (
              <Image
                source={{ uri: file.uri }}
                style={[styles.thumbnail, { borderRadius: radius.sm - 2 }]}
              />
            ) : (
              <Ionicons name="document-outline" size={24} color={colors.accent} />
            )}
            <View style={[styles.chipInfo, { marginLeft: spacing.sm }]}>
              <Text
                style={{ color: colors.text, fontSize: 13, fontWeight: '500' }}
                numberOfLines={1}
              >
                {file.name}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                {formatSize(file.size)}
              </Text>
            </View>
            <Pressable onPress={() => onRemove(idx)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '48%',
  },
  thumbnail: { width: 36, height: 36 },
  chipInfo: { flex: 1 },
});

