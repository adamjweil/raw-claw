import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface AttachmentPickerProps {
  onFilesPicked: (files: PickedFile[]) => void;
  onClose: () => void;
}

// Lazy-load native modules so the component doesn't crash in Expo Go
let DocumentPicker: typeof import('expo-document-picker') | null = null;
let ImagePicker: typeof import('expo-image-picker') | null = null;

try {
  DocumentPicker = require('expo-document-picker');
} catch {
  // Native module not available (e.g. running in Expo Go)
}

try {
  ImagePicker = require('expo-image-picker');
} catch {
  // Native module not available
}

const NATIVE_UNAVAILABLE_MSG =
  'This feature requires a development build. It is not available in Expo Go.';

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  onFilesPicked,
  onClose,
}) => {
  const { colors, spacing, radius, typography } = useTheme();

  const pickFromLibrary = async () => {
    if (!ImagePicker) {
      Alert.alert('Unavailable', NATIVE_UNAVAILABLE_MSG);
      onClose();
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const files: PickedFile[] = result.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName || `image_${Date.now()}.jpg`,
          type: a.mimeType || 'image/jpeg',
          size: a.fileSize || 0,
        }));
        onFilesPicked(files);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
    onClose();
  };

  const takePhoto = async () => {
    if (!ImagePicker) {
      Alert.alert('Unavailable', NATIVE_UNAVAILABLE_MSG);
      onClose();
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required');
        onClose();
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const a = result.assets[0];
        onFilesPicked([
          {
            uri: a.uri,
            name: a.fileName || `photo_${Date.now()}.jpg`,
            type: a.mimeType || 'image/jpeg',
            size: a.fileSize || 0,
          },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo');
    }
    onClose();
  };

  const pickDocument = async () => {
    if (!DocumentPicker) {
      Alert.alert('Unavailable', NATIVE_UNAVAILABLE_MSG);
      onClose();
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const files: PickedFile[] = result.assets.map((a) => ({
          uri: a.uri,
          name: a.name,
          type: a.mimeType || 'application/octet-stream',
          size: a.size || 0,
        }));
        onFilesPicked(files);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick file');
    }
    onClose();
  };

  const options = [
    { label: 'Photo Library', icon: 'images-outline' as const, action: pickFromLibrary },
    { label: 'Take Photo', icon: 'camera-outline' as const, action: takePhoto },
    { label: 'Choose File', icon: 'document-outline' as const, action: pickDocument },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderRadius: radius.lg,
          marginHorizontal: spacing.md,
          marginBottom: spacing.sm,
          padding: spacing.sm,
        },
      ]}
    >
      {options.map((opt) => (
        <Pressable
          key={opt.label}
          onPress={opt.action}
          style={({ pressed }) => [
            styles.option,
            {
              backgroundColor: pressed ? colors.card : 'transparent',
              borderRadius: radius.sm,
              padding: spacing.md,
            },
          ]}
        >
          <Ionicons name={opt.icon} size={22} color={colors.accent} />
          <Text
            style={{
              color: colors.text,
              fontSize: typography.body.fontSize,
              marginLeft: spacing.md,
            }}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderTopWidth: 1 },
  option: { flexDirection: 'row', alignItems: 'center' },
});
