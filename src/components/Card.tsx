import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  headerRight?: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = React.memo(({ children, title, icon, headerRight, style }) => {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          padding: spacing.md + 2,
          marginBottom: spacing.md,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {(title || icon || headerRight) && (
        <View style={[styles.header, { marginBottom: spacing.md - 2, gap: spacing.sm }]}>
          {icon && <Ionicons name={icon} size={18} color={colors.accent} />}
          {title && (
            <Text
              style={[
                styles.title,
                { color: colors.text, fontSize: typography.heading.fontSize, fontWeight: typography.heading.fontWeight },
              ]}
            >
              {title}
            </Text>
          )}
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
      )}
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {},
  headerRight: {
    marginLeft: 'auto',
  },
});

