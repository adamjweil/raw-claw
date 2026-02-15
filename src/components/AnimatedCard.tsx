import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';

interface AnimatedCardProps {
  children: React.ReactNode;
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  delay?: number;
  style?: ViewStyle;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  title,
  icon,
  delay = 0,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Card title={title} icon={icon} style={style}>
        {children}
      </Card>
    </Animated.View>
  );
};
