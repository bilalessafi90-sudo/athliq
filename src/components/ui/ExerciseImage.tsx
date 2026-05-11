import React, { useState } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { Colors, Radius } from '../../constants';
import { useExerciseImage } from '../../hooks/useExerciseImage';

interface Props {
  exerciseName: string;
  muscleGroups?: string[];
  height?: number;
  borderRadius?: number;
}

export function ExerciseImage({
  exerciseName,
  muscleGroups = [],
  height = 180,
  borderRadius = 0,
}: Props) {
  const { imageUrl, isLoading } = useExerciseImage(exerciseName, muscleGroups);
  const [loaded, setLoaded] = useState(false);
  const opacity = React.useRef(new Animated.Value(0)).current;

  const onLoad = () => {
    setLoaded(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[styles.wrap, { height, borderRadius }]}>
      {/* Skeleton shown while fetching from wger or image not yet painted */}
      {(!loaded) && (
        <View style={[StyleSheet.absoluteFill, styles.skeleton, { borderRadius }]}>
          <View style={styles.shimmer} />
        </View>
      )}

      {/* Actual image — fades in once loaded */}
      {imageUrl ? (
        <Animated.Image
          source={{ uri: imageUrl }}
          style={[StyleSheet.absoluteFill, { opacity, borderRadius }]}
          resizeMode="cover"
          onLoad={onLoad}
          onError={() => setLoaded(true)} // don't keep showing skeleton on error
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
  },
  skeleton: {
    backgroundColor: Colors.card,
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    opacity: 0.6,
  },
});
