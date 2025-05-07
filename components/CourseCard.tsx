import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Star } from 'lucide-react-native';
import * as Progress from 'react-native-progress';
import { Course } from '@/types';
import Colors from '@/constants/Colors';

interface CourseCardProps {
  course: Course;
  variant?: 'horizontal' | 'vertical';
}

export default function CourseCard({ course, variant = 'vertical' }: CourseCardProps) {
  const navigateToCourse = () => {
    router.push(`/course/${course.id}`);
  };

  if (variant === 'horizontal') {
    return (
      <TouchableOpacity 
        style={styles.horizontalCard} 
        onPress={navigateToCourse}
        activeOpacity={0.7}
      >
        <Image source={{ uri: course.thumbnail }} style={styles.horizontalImage} />
        <View style={styles.horizontalContent}>
          <Text style={styles.category}>{course.category}</Text>
          <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
          <View style={styles.details}>
            <View style={styles.ratingContainer}>
              <Star size={14} color={Colors.warning} fill={Colors.warning} />
              <Text style={styles.rating}>{course.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.duration}>{course.duration}</Text>
          </View>
          {course.progress !== undefined && (
            <View style={styles.progressContainer}>
              <Progress.Bar 
                progress={course.progress / 100} 
                width={null} 
                height={4}
                color={Colors.primary}
                unfilledColor={Colors.backgroundTertiary}
                borderWidth={0}
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>{course.progress}% complete</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={navigateToCourse}
      activeOpacity={0.7}
    >
      <Image source={{ uri: course.thumbnail }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.category}>{course.category}</Text>
        <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
        <View style={styles.details}>
          <View style={styles.ratingContainer}>
            <Star size={14} color={Colors.warning} fill={Colors.warning} />
            <Text style={styles.rating}>{course.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.duration}>{course.duration}</Text>
        </View>
        {course.progress !== undefined && (
          <View style={styles.progressContainer}>
            <Progress.Bar 
              progress={course.progress / 100} 
              width={null} 
              height={4}
              color={Colors.primary}
              unfilledColor={Colors.backgroundTertiary}
              borderWidth={0}
              style={styles.progressBar}
            />
            <Text style={styles.progressText}>{course.progress}% complete</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    width: 280,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  horizontalCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  image: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  horizontalImage: {
    width: 120,
    height: '100%',
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
  },
  horizontalContent: {
    flex: 1,
    padding: 16,
  },
  category: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 8,
    lineHeight: 22,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  duration: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    marginBottom: 6,
  },
  progressText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  }
});