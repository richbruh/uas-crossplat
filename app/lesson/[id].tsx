//lesson/[id].tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getLessonById, getCourseById, getLessonsByCourseId } from '@/data/courses';
import { useTheme } from '../context/ThemeContext';

export default function LessonScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const lesson = getLessonById(id);

  if (!lesson) {
    return (
      <View style={styles.centerContainer}>
        <Text>Lesson not found</Text>
      </View>
    );
  }

  const course = getCourseById(lesson.course_id);
  const courseLessons = getLessonsByCourseId(lesson.course_id);

  // Urutkan berdasarkan lesson_order
  const sortedLessons = [...courseLessons].sort((a, b) => a.lesson_order - b.lesson_order);
  const lessonIndex = sortedLessons.findIndex(l => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? sortedLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < sortedLessons.length - 1 ? sortedLessons[lessonIndex + 1] : null;

  const closeLesson = () => {
    router.back();
  };

  const navigateToLesson = (lessonId: string) => {
    router.replace(`/lesson/${lessonId}`);
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_bottom',
        }} 
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={closeLesson} style={styles.closeButton}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {course?.title}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.lessonInfo}>
            <Text style={styles.lessonTitle}>{lesson.title}</Text>
            <Text style={styles.lessonOrder}>Lesson #{lesson.lesson_order}</Text>
            <Text style={styles.lessonDate}>Created at: {new Date(lesson.created_at).toLocaleString()}</Text>
          </View>
          <View style={styles.lessonContent}>
            <Text style={styles.contentText}>
              {lesson.content || 'No content available.'}
            </Text>
          </View>
        </ScrollView>
        
        <View style={styles.navigationContainer}>
          <TouchableOpacity 
            style={[styles.navButton, !prevLesson && styles.disabledButton]} 
            disabled={!prevLesson}
            onPress={() => prevLesson && navigateToLesson(prevLesson.id)}
          >
            <ChevronLeft size={20} color={prevLesson ? colors.primary : colors.textTertiary} />
            <Text style={[styles.navButtonText, !prevLesson && styles.disabledButtonText]}>Previous</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.navButton, styles.disabledButton]}
            disabled={true}
          >
            <Text style={[styles.navButtonText, styles.disabledButtonText]}>
              Complete
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, !nextLesson && styles.disabledButton]} 
            disabled={!nextLesson}
            onPress={() => nextLesson && navigateToLesson(nextLesson.id)}
          >
            <Text style={[styles.navButtonText, !nextLesson && styles.disabledButtonText]}>Next</Text>
            <ChevronRight size={20} color={nextLesson ? colors.primary : colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  lessonInfo: {
    marginBottom: 24,
  },
  lessonTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  lessonOrder: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  lessonDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  lessonContent: {
    marginBottom: 32,
  },
  contentText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: 16,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    color: colors.textTertiary,
  },
});
