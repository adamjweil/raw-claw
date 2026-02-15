import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface TokenBarProps {
  current: number;
  limit?: number;
}

export const TokenBar: React.FC<TokenBarProps> = ({ current, limit }) => {
  const { colors, radius } = useTheme();
  const percentage = limit ? Math.min((current / limit) * 100, 100) : 0;

  if (!limit) return null;

  return (
    <View style={[styles.barBg, { backgroundColor: colors.surface, borderRadius: radius.sm }]}>
      <View
        style={[
          styles.barFill,
          {
            backgroundColor: percentage > 80 ? colors.warning : colors.accent,
            borderRadius: radius.sm,
            width: `${percentage}%` as unknown as number,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  barBg: { height: 6, width: '100%', marginTop: 8 },
  barFill: { height: 6 },
});

