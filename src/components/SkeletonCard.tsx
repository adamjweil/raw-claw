import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, Easing } from 'react-native';
import { useTheme } from '../theme';

interface SkeletonCardProps {
  lines?: number;
  style?: ViewStyle;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3, style }) => {
  const { colors, spacing, radius } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

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
      {/* Title skeleton */}
      <Animated.View
        style={[
          styles.line,
          {
            opacity,
            backgroundColor: colors.surface,
            width: '40%',
            height: 16,
            borderRadius: radius.sm,
            marginBottom: spacing.md,
          },
        ]}
      />
      {/* Content lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.line,
            {
              opacity,
              backgroundColor: colors.surface,
              width: i === lines - 1 ? '60%' : '100%',
              height: 12,
              borderRadius: radius.sm,
              marginBottom: spacing.sm,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  line: {},
});
