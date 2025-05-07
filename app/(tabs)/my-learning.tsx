//(tabs)/my-learning.tsx
import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, Platform } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import SectionHeader from '@/components/SectionHeader';
import CoursesList from '@/components/CoursesList';
import { getEnrolledCourses } from '@/data/courses';
import Colors from '@/constants/Colors';

export default function MyLearningScreen() {
  const enrolledCourses = getEnrolledCourses();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Learning</Text>
      </View>
      
      {enrolledCourses.length > 0 ? (
        <Animated.View entering={FadeInUp.duration(500)} style={styles.content}>
          <SectionHeader title="In Progress" />
          <CoursesList courses={enrolledCourses} horizontal={false} />
        </Animated.View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You haven't enrolled in any courses yet</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 48,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});