import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius } from '../../constants';

interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export function ProgressBar({
  progress,
  color = Colors.primary,
  height = 6,
  style,
  animated = true,
}: ProgressBarProps) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(width, {
        toValue: Math.min(Math.max(progress, 0), 1),
        duration: 500,
        useNativeDriver: false,
      }).start();
    } else {
      width.setValue(Math.min(Math.max(progress, 0), 1));
    }
  }, [progress]);

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: color,
            width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {},
});
