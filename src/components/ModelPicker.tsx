import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
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
  const [customModel, setCustomModel] = useState('');

  // Current model from gateway status
  const currentModel = state.status?.model || '';

  useEffect(() => {
    if (visible) {
      loadModels();
      loadSavedOverride();
      setCustomModel('');
    }
  }, [visible]);

  const loadModels = async () => {
    if (!state.client) return;
    setLoading(true);
    try {
      const result = await state.client.getAvailableModels();
      setModels(result);
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedOverride = async () => {
    const saved = await AsyncStorage.getItem(MODEL_OVERRIDE_KEY);
    setSelectedId(saved);
  };

  const selectModel = useCallback(async (modelId: string | null) => {
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not update model.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [state.client, onClose]);

  const handleApplyCustomModel = useCallback(() => {
    const trimmed = customModel.trim();
    if (!trimmed) return;
    selectModel(trimmed);
  }, [customModel, selectModel]);

  const formatContextWindow = (tokens?: number) => {
    if (!tokens) return '';
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(0)}M ctx`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K ctx`;
    return `${tokens} ctx`;
  };

  // Build display list: include current model if not already in the fetched list
  const displayModels: AvailableModel[] = [...models];
  if (currentModel && !displayModels.some((m) => m.id === currentModel || m.name === currentModel)) {
    displayModels.unshift({
      id: currentModel,
      name: currentModel,
      provider: currentModel.toLowerCase().includes('claude')
        ? 'Anthropic'
        : currentModel.toLowerCase().includes('gpt')
        ? 'OpenAI'
        : '',
    });
  }

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
        onPress={() => {}}
        disabled
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.modelName, { color: colors.text, fontSize: typography.body.fontSize }]}>
            {item.name}
          </Text>
          {(item.provider || item.contextWindow) ? (
            <Text style={[styles.modelMeta, { color: colors.textMuted, fontSize: typography.caption.fontSize }]}>
              {item.provider}
              {item.contextWindow ? ` · ${formatContextWindow(item.contextWindow)}` : ''}
            </Text>
          ) : null}
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
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={[styles.sheetTitle, { color: colors.text, fontSize: typography.modalTitle.fontSize }]}>
                Choose Model
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                (currently unavailable; for now model selection must be done via open claw terminal)
              </Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Manual model input — disabled for now */}
          <View style={[styles.customInputRow, { padding: spacing.md, borderBottomColor: colors.border, opacity: 0.4 }]}>
            <TextInput
              style={[
                styles.customInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderRadius: radius.md,
                  padding: spacing.sm + 2,
                  fontSize: typography.body.fontSize,
                  borderColor: colors.border,
                  flex: 1,
                },
              ]}
              value={customModel}
              onChangeText={setCustomModel}
              placeholder="Type a model name..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleApplyCustomModel}
              editable={false}
            />
            <Pressable
              style={[
                styles.applyBtn,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm + 2,
                  paddingHorizontal: spacing.md,
                  marginLeft: spacing.sm,
                },
              ]}
              onPress={handleApplyCustomModel}
              disabled
            >
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.body.fontSize,
                  fontWeight: '600',
                }}
              >
                Apply
              </Text>
            </Pressable>
          </View>

          {/* Use Default option — disabled for now */}
          <Pressable
            style={[
              styles.modelRow,
              {
                backgroundColor: selectedId === null ? colors.accent + '15' : 'transparent',
                borderBottomColor: colors.border,
                padding: spacing.md,
                opacity: 0.4,
              },
            ]}
            onPress={() => {}}
            disabled
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
          ) : displayModels.length > 0 ? (
            <FlatList
              data={displayModels}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              style={{ flex: 1, opacity: 0.4 }}
            />
          ) : (
            <View style={[styles.emptyState, { padding: spacing.xl }]}>
              <Text style={{ color: colors.textMuted, fontSize: typography.body.fontSize, textAlign: 'center' }}>
                No models returned by gateway.{'\n'}Use the text field above to enter a model name manually.
              </Text>
            </View>
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
    maxHeight: '85%',
    minHeight: 400,
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
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  customInput: {
    borderWidth: 1,
  },
  applyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
