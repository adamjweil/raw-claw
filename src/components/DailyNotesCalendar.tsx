import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useTheme } from '../theme';
import { DailyNote } from '../types';

interface DailyNotesCalendarProps {
  getDailyNotes: () => Promise<DailyNote[]>;
  onSelectNote: (date: string) => void;
}

export const DailyNotesCalendar: React.FC<DailyNotesCalendarProps> = ({
  getDailyNotes,
  onSelectNote,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<DailyNote | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getDailyNotes()
      .then((data) => {
        if (mounted) setNotes(data);
      })
      .catch(() => {
        // silent
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [getDailyNotes]);

  // Build marked dates for the calendar
  const markedDates = React.useMemo(() => {
    const marks: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }> = {};
    for (const note of notes) {
      marks[note.date] = {
        marked: true,
        dotColor: colors.accent,
        ...(note.date === selectedDate
          ? { selected: true, selectedColor: colors.accent }
          : {}),
      };
    }
    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = {
        marked: false,
        dotColor: colors.accent,
        selected: true,
        selectedColor: colors.accent + '44',
      };
    }
    return marks;
  }, [notes, selectedDate, colors.accent]);

  const handleDayPress = useCallback(
    (day: DateData) => {
      setSelectedDate(day.dateString);
      const note = notes.find((n) => n.date === day.dateString) || null;
      setSelectedNote(note);
    },
    [notes]
  );

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Calendar
        markedDates={markedDates}
        onDayPress={handleDayPress}
        theme={{
          calendarBackground: colors.bg,
          dayTextColor: colors.text,
          textDisabledColor: colors.textMuted + '66',
          monthTextColor: colors.text,
          textMonthFontWeight: '700',
          textMonthFontSize: typography.heading.fontSize,
          textDayFontSize: 14,
          textDayHeaderFontSize: 12,
          todayTextColor: colors.accent,
          arrowColor: colors.accent,
          selectedDayBackgroundColor: colors.accent,
          selectedDayTextColor: '#fff',
          dotColor: colors.accent,
          selectedDotColor: '#fff',
        }}
        style={{
          borderRadius: radius.lg,
          overflow: 'hidden',
        }}
      />

      {/* Selected date note preview */}
      {selectedDate && (
        <View
          style={[
            styles.notePreview,
            {
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              padding: spacing.md,
              marginTop: spacing.md,
              marginHorizontal: spacing.xs,
            },
          ]}
        >
          <View style={styles.noteHeader}>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.heading.fontSize,
                fontWeight: '600',
              }}
            >
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {selectedNote ? (
            <>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.body.fontSize,
                  lineHeight: 22,
                  marginTop: spacing.sm,
                }}
                numberOfLines={8}
              >
                {selectedNote.content}
              </Text>
              <Text
                style={{
                  color: colors.accent,
                  fontSize: typography.small.fontSize,
                  fontWeight: '500',
                  marginTop: spacing.sm,
                }}
                onPress={() => onSelectNote(selectedDate)}
              >
                View full note →
              </Text>
            </>
          ) : (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: typography.body.fontSize,
                marginTop: spacing.sm,
                fontStyle: 'italic',
              }}
            >
              No note for this date
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  notePreview: {},
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

