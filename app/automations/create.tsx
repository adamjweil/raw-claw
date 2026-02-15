import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme';
import { useStore } from '../../src/services/store';
import { useCronJobs, useSkills } from '../../src/hooks';
import { CronScheduleBuilder } from '../../src/components/CronScheduleBuilder';
import { CronJob } from '../../src/types';

const STEPS = ['Name', 'Schedule', 'Action', 'Review'];

export default function CreateAutomation() {
  const { colors, spacing, radius, typography } = useTheme();
  const { state } = useStore();
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const cronJobs = useCronJobs();
  const skills = useSkills();

  const isEditing = !!editId;
  const existingJob = editId ? cronJobs.data?.find((j) => j.id === editId) : null;

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cron, setCron] = useState('0 9 * * *');
  const [cronHuman, setCronHuman] = useState('Every day at 9:00 AM');
  const [actionType, setActionType] = useState<'message' | 'skill'>('message');
  const [actionMessage, setActionMessage] = useState('');
  const [actionSkillId, setActionSkillId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (existingJob) {
      setName(existingJob.name);
      setCron(existingJob.schedule);
      setCronHuman(existingJob.scheduleHuman);
    }
  }, [existingJob]);

  const canAdvance = useCallback(() => {
    switch (step) {
      case 0:
        return name.trim().length > 0;
      case 1:
        return cron.split(/\s+/).length === 5;
      case 2:
        return actionType === 'message'
          ? actionMessage.trim().length > 0
          : actionSkillId !== null;
      default:
        return true;
    }
  }, [step, name, cron, actionType, actionMessage, actionSkillId]);

  const handleCreate = useCallback(async () => {
    if (!state.client) return;
    setSaving(true);
    try {
      const payload: Partial<CronJob> = {
        name: name.trim(),
        schedule: cron,
        scheduleHuman: cronHuman,
        enabled: true,
      };

      if (isEditing && editId) {
        await state.client.updateCronJob(editId, payload);
      } else {
        await state.client.createCronJob(payload);
      }

      cronJobs.refresh();
      router.back();
    } catch {
      Alert.alert(
        'Error',
        isEditing ? 'Failed to update automation.' : 'Failed to create automation.'
      );
      setSaving(false);
    }
  }, [state.client, name, cron, cronHuman, isEditing, editId, cronJobs, router]);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: colors.text, fontSize: 20, fontWeight: '700' }]}>
              Name & Description
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.body.fontSize,
                marginBottom: spacing.lg,
              }}
            >
              Give your automation a clear, descriptive name.
            </Text>
            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
              Name *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  borderColor: colors.border,
                  fontSize: typography.body.fontSize,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Daily Summary"
              placeholderTextColor={colors.textMuted}
            />
            <Text
              style={[
                styles.label,
                { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.lg },
              ]}
            >
              Description (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  borderColor: colors.border,
                  fontSize: typography.body.fontSize,
                  height: 80,
                  textAlignVertical: 'top',
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="What does this automation do?"
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: colors.text, fontSize: 20, fontWeight: '700' }]}>
              Schedule
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.body.fontSize,
                marginBottom: spacing.lg,
              }}
            >
              How often should this automation run?
            </Text>
            <CronScheduleBuilder
              value={cron}
              onChange={(c, h) => {
                setCron(c);
                setCronHuman(h);
              }}
            />
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: colors.text, fontSize: 20, fontWeight: '700' }]}>
              Action
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.body.fontSize,
                marginBottom: spacing.lg,
              }}
            >
              What should happen when this automation runs?
            </Text>

            {/* Action type selector */}
            <View style={[styles.actionTypeRow, { gap: spacing.sm, marginBottom: spacing.lg }]}>
              {(['message', 'skill'] as const).map((t) => {
                const isActive = actionType === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setActionType(t)}
                    style={[
                      styles.actionTypeBtn,
                      {
                        backgroundColor: isActive ? colors.accent + '22' : colors.card,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        borderWidth: 1,
                        borderColor: isActive ? colors.accent + '66' : colors.border,
                        flex: 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={t === 'message' ? 'chatbubble' : 'extension-puzzle'}
                      size={20}
                      color={isActive ? colors.accent : colors.textMuted}
                    />
                    <Text
                      style={{
                        color: isActive ? colors.accent : colors.textSecondary,
                        fontSize: typography.body.fontSize,
                        fontWeight: '500',
                        marginTop: 4,
                      }}
                    >
                      {t === 'message' ? 'Send Message' : 'Run Skill'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {actionType === 'message' ? (
              <>
                <Text
                  style={[
                    styles.label,
                    { color: colors.textSecondary, marginBottom: spacing.xs },
                  ]}
                >
                  Message or command to send
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      borderColor: colors.border,
                      fontSize: typography.body.fontSize,
                      height: 100,
                      textAlignVertical: 'top',
                    },
                  ]}
                  value={actionMessage}
                  onChangeText={setActionMessage}
                  placeholder="e.g. Give me a daily summary of tasks"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </>
            ) : (
              <>
                <Text
                  style={[
                    styles.label,
                    { color: colors.textSecondary, marginBottom: spacing.sm },
                  ]}
                >
                  Select a skill to run
                </Text>
                <ScrollView style={{ maxHeight: 200 }}>
                  {(skills.data || []).map((skill) => {
                    const isSelected = actionSkillId === skill.id;
                    return (
                      <Pressable
                        key={skill.id}
                        onPress={() => setActionSkillId(skill.id)}
                        style={[
                          styles.skillOption,
                          {
                            backgroundColor: isSelected
                              ? colors.accent + '22'
                              : colors.card,
                            borderRadius: radius.md,
                            padding: spacing.md,
                            marginBottom: spacing.xs,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.accent + '66' : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            (skill.icon as keyof typeof Ionicons.glyphMap) ||
                            'extension-puzzle'
                          }
                          size={18}
                          color={isSelected ? colors.accent : colors.textSecondary}
                        />
                        <Text
                          style={{
                            color: isSelected ? colors.accent : colors.textSecondary,
                            fontSize: typography.body.fontSize,
                            marginLeft: spacing.sm,
                          }}
                        >
                          {skill.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: colors.text, fontSize: 20, fontWeight: '700' }]}>
              Review
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.body.fontSize,
                marginBottom: spacing.lg,
              }}
            >
              Confirm your automation settings.
            </Text>

            <View
              style={[
                styles.reviewCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.reviewRow, { marginBottom: spacing.md }]}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Name</Text>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                  {name}
                </Text>
              </View>
              {description ? (
                <View style={[styles.reviewRow, { marginBottom: spacing.md }]}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Description</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                    {description}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.reviewRow, { marginBottom: spacing.md }]}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Schedule</Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>
                  {cronHuman}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {cron}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Action</Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>
                  {actionType === 'message'
                    ? `Send: "${actionMessage}"`
                    : `Run skill: ${
                        skills.data?.find((s) => s.id === actionSkillId)?.name || '—'
                      }`}
                </Text>
              </View>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: spacing.lg, paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.heading.fontSize,
              fontWeight: '700',
              marginLeft: spacing.md,
            }}
          >
            {isEditing ? 'Edit Automation' : 'New Automation'}
          </Text>
        </View>

        {/* Step indicators */}
        <View style={[styles.stepsRow, { marginTop: spacing.lg, marginBottom: spacing.xl }]}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepIndicator}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      i < step
                        ? colors.success
                        : i === step
                        ? colors.accent
                        : colors.textMuted + '44',
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                  },
                ]}
              >
                {i < step ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={{
                  color: i === step ? colors.text : colors.textMuted,
                  fontSize: 11,
                  marginTop: 4,
                  fontWeight: i === step ? '600' : '400',
                }}
              >
                {s}
              </Text>
            </View>
          ))}
        </View>

        {/* Step content */}
        {renderStep()}
      </ScrollView>

      {/* Bottom navigation */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderTopColor: colors.border,
          },
        ]}
      >
        {step > 0 && (
          <Pressable
            style={[
              styles.navBtn,
              {
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm + 2,
              },
            ]}
            onPress={() => setStep(step - 1)}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Back</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        {step < STEPS.length - 1 ? (
          <Pressable
            style={[
              styles.navBtnPrimary,
              {
                backgroundColor: canAdvance() ? colors.accent : colors.textMuted + '44',
                borderRadius: radius.md,
                paddingHorizontal: spacing.xl,
                paddingVertical: spacing.sm + 2,
              },
            ]}
            onPress={() => setStep(step + 1)}
            disabled={!canAdvance()}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Next</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.navBtnPrimary,
              {
                backgroundColor: colors.accent,
                borderRadius: radius.md,
                paddingHorizontal: spacing.xl,
                paddingVertical: spacing.sm + 2,
              },
            ]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                {isEditing ? 'Save Changes' : 'Create Automation'}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepIndicator: { alignItems: 'center' },
  stepDot: { alignItems: 'center', justifyContent: 'center' },
  stepTitle: { marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '500' },
  input: { borderWidth: 1 },
  actionTypeRow: { flexDirection: 'row' },
  actionTypeBtn: { alignItems: 'center' },
  skillOption: { flexDirection: 'row', alignItems: 'center' },
  reviewCard: {},
  reviewRow: {},
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  navBtn: { borderWidth: 1 },
  navBtnPrimary: {},
});

