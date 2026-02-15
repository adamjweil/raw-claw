import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface UsageChartProps {
  data: { date: string; tokens: number }[];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getAbbrevDay(dateStr: string): string {
  const d = new Date(dateStr);
  return DAY_LABELS[d.getDay()] || dateStr.slice(-2);
}

export const UsageChart: React.FC<UsageChartProps> = ({ data }) => {
  const { colors, spacing, radius, typography } = useTheme();

  const maxTokens = useMemo(
    () => Math.max(...data.map((d) => d.tokens), 1),
    [data]
  );

  const barHeight = 100;

  return (
    <View style={[styles.container, { gap: spacing.sm }]}>
      <View style={[styles.chartRow, { height: barHeight }]}>
        {data.map((day, i) => {
          const pct = day.tokens / maxTokens;
          const height = Math.max(pct * barHeight, 4);
          return (
            <View key={day.date} style={styles.barWrap}>
              <View style={[styles.barContainer, { height: barHeight }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor:
                        i === data.length - 1 ? colors.accent : colors.accent + '66',
                      borderRadius: 4,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labelsRow}>
        {data.map((day) => (
          <View key={day.date} style={styles.barWrap}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 10,
                textAlign: 'center',
              }}
            >
              {getAbbrevDay(day.date)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  barWrap: { flex: 1, alignItems: 'center' },
  barContainer: { justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '70%', minWidth: 8 },
  labelsRow: {
    flexDirection: 'row',
    gap: 4,
  },
});

