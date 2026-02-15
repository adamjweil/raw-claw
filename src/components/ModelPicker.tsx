import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme';
import { useStore } from '../services/store';

const MODEL_OVERRIDE_KEY = 'paw_model_override';

interface AvailableModel {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
}

interface ModelPickerProps {
  visible: boolean;
  onClose: () => void;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({ visible, onClose }) => {
  const { colors, spacing, radius, typography } = useTheme();
  const { state } = useStore();
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadModels();
      loadSavedOverride();
    }
  }, [visible]);

  const loadModels = async () => {
    if (!state.client) return;
    setLoading(true);
    try {
      const result = await state.client.getAvailableModels();
      setModels(result);
    } catch {
      // fallback to empty
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedOverride = async () => {
    const saved = await AsyncStorage.getItem(MODEL_OVERRIDE_KEY);
    setSelectedId(saved);
  };

  const selectModel = async (modelId: string | null) => {
    setSaving(true);
    try {
      if (state.client) {
        await state.client.setModelOverride(modelId);
      }
      if (modelId) {
        await AsyncStorage.setItem(MODEL_OVERRIDE_KEY, modelId);
      } else {
        await AsyncStorage.removeItem(MODEL_OVERRIDE_KEY);
      }
      setSelectedId(modelId);
      onClose();
    } catch {
      // stay open on error
    } finally {
      setSaving(false);
    }
  };

  const formatContextWindow = (tokens?: number) => {
    if (!tokens) return '';
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M ctx`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K ctx`;
    return `${tokens} ctx`;
  };

  const renderItem = ({ item }: { item: AvailableModel }) => {
    const isSelected = selectedId === item.id;
    return (
      <Pressable
        style={[
          styles.modelRow,
          {
            backgroundColor: isSelected ? colors.accent + '15' : 'transparent',
            borderBottomColor: colors.border,
            padding: spacing.md,
          },
        ]}
        onPress={() => selectModel(item.id)}
        disabled={saving}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.modelName, { color: colors.text, fontSize: typography.body.fontSize }]}>
            {item.name}
          </Text>
          <Text style={[styles.modelMeta, { color: colors.textMuted, fontSize: typography.caption.fontSize }]}>
            {item.provider}
            {item.contextWindow ? ` · ${formatContextWindow(item.contextWindow)}` : ''}
          </Text>
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
            },
          ]}
        >
          <View style={[styles.sheetHeader, { padding: spacing.lg, borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.text, fontSize: typography.modalTitle.fontSize }]}>
              Choose Model
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Use Default option */}
          <Pressable
            style={[
              styles.modelRow,
              {
                backgroundColor: selectedId === null ? colors.accent + '15' : 'transparent',
                borderBottomColor: colors.border,
                padding: spacing.md,
              },
            ]}
            onPress={() => selectModel(null)}
            disabled={saving}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.modelName, { color: colors.accent, fontSize: typography.body.fontSize }]}>
                Use Default
              </Text>
              <Text style={[styles.modelMeta, { color: colors.textMuted, fontSize: typography.caption.fontSize }]}>
                Let the gateway decide which model to use
              </Text>
            </View>
            {selectedId === null && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
          </Pressable>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
          ) : (
            <FlatList
              data={models}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    minHeight: 300,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontWeight: '700',
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  modelName: {
    fontWeight: '600',
  },
  modelMeta: {
    marginTop: 2,
  },
});

