import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface ScreenHeaderProps {
  title: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, leftElement, rightElement }) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { marginBottom: spacing.xl }]}>
      <View style={styles.titleRow}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontSize: typography.title.fontSize,
              fontWeight: typography.title.fontWeight,
            },
          ]}
        >
          {title}
        </Text>
        {leftElement}
      </View>
      {rightElement && <View>{rightElement}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

