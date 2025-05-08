//course/[id].tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, Modal, Alert, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Star, Clock, BookOpen, ChartBar as BarChart } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Progress from 'react-native-progress';
import LessonListItem from '@/components/LessonListItem';
import { getCourseById, getLessonsByCourseId } from '@/data/courses';
import { useTheme } from '../context/ThemeContext';

export default function CourseDetailScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [showExamModal, setShowExamModal] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const course = getCourseById(id);
  const lessons = getLessonsByCourseId(id);
  
  if (!course) {
    return (
      <View style={styles.centerContainer}>
        <Text>Course not found</Text>
      </View>
    );
  }

  const goBack = () => {
    router.back();
  };
  
  // Calculate progress
  const completedLessons = lessons.filter(lesson => lesson.completed).length;
  const progressPercentage = lessons.length > 0 ? (completedLessons / lessons.length) : 0;
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }} 
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View>
          <Image source={{ uri: course.thumbnail }} style={styles.coverImage} />
          <View style={styles.gradientOverlay} />
        </View>
        
        <SafeAreaView style={styles.content}>
          <Animated.View entering={FadeIn.duration(500)}>
            <View style={styles.courseHeader}>
              <View style={styles.courseInfo}>
                <Text style={styles.category}>{course.category}</Text>
                <Text style={styles.title}>{course.title}</Text>
                <Text style={styles.instructor}>By {course.instructor}</Text>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Star size={16} color={colors.warning} fill={colors.warning} />
                  <Text style={styles.statText}>{course.rating.toFixed(1)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>{course.duration}</Text>
                </View>
                <View style={styles.statItem}>
                  <BookOpen size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>{course.lessons} lessons</Text>
                </View>
                <View style={styles.statItem}>
                  <BarChart size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>{course.level}</Text>
                </View>
              </View>
              
              {course.enrolled && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>Your Progress</Text>
                    <Text style={styles.progressPercentage}>{Math.round(progressPercentage * 100)}%</Text>
                  </View>
                  <Progress.Bar 
                    progress={progressPercentage} 
                    width={null} 
                    height={8}
                    color={colors.primary}
                    unfilledColor={colors.backgroundTertiary}
                    borderWidth={0}
                    borderRadius={4}
                  />
                  <Text style={styles.progressText}>
                    {completedLessons} of {lessons.length} lessons completed
                  </Text>
                </View>
              )}
              
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionTitle}>About This Course</Text>
                <Text style={styles.description}>{course.description}</Text>
              </View>
              
              <View style={styles.tagsContainer}>
                {course.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.lessonsContainer}>
              <Text style={styles.lessonsTitle}>Course Content</Text>
              {lessons.map((lesson) => (
                <LessonListItem key={lesson.id} lesson={lesson} />
              ))}
            </View>
          </Animated.View>
        </SafeAreaView>
        
        {!course.enrolled && (
          <View style={styles.enrollButtonContainer}>
            <TouchableOpacity style={styles.enrollButton}>
              <Text style={styles.enrollButtonText}>Enroll in Course</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const getStyles = (colors: typeof import('@/constants/Colors').default.light) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    flex: 1,
    marginTop: -40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.background,
    paddingBottom: 100,
  },
  courseHeader: {
    padding: 24,
  },
  courseInfo: {
    marginBottom: 16,
  },
  category: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.primary,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: 8,
    lineHeight: 32,
  },
  instructor: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  progressPercentage: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: colors.primary,
  },
  progressText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  descriptionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  tag: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
  lessonsContainer: {
    paddingHorizontal: 24,
  },
  lessonsTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  enrollButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  enrollButton: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enrollButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
  examButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  examButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: 24,
    borderRadius: 16,
    width: '80%',
    alignItems: 'center',
  },
  modalText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: 'Inter-SemiBold',
    color: colors.background,
    fontSize: 14,
  },  
});
