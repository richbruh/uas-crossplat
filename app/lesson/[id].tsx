import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { X, ChevronLeft, ChevronRight, Play, Clock } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/app/utils/supabase';
import { Lesson, Course } from '@/models';
import { getLessonDuration, getLessonTypeIcon, getLessonTypeLabel } from '@/models/lesson';

export default function LessonScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const styles = getStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLessonData();
  }, [id]);

  const fetchLessonData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id)
        .single();

      if (lessonError) throw lessonError;
      setLesson(lessonData);

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', lessonData.course_id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch all lessons in this course
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', lessonData.course_id)
        .order('lesson_order', { ascending: true });

      if (lessonsError) throw lessonsError;
      setCourseLessons(lessonsData || []);

    } catch (err: any) {
      setError(err.message || 'Failed to load lesson');
    } finally {
      setLoading(false);
    }
  };

  const closeLesson = () => {
    router.back();
  };

  const navigateToLesson = (lessonId: string) => {
    router.replace(`/lesson/${lessonId}`);
  };

  const markLessonComplete = async () => {
    if (!lesson || !session?.user) return;

    try {
      // Update enrollment progress
      const { error } = await supabase
        .from('enrollments')
        .update({
          completed_lessons: supabase.rpc('increment_completed_lessons'),
          progress_percentage: Math.round((courseLessons.findIndex(l => l.id === lesson.id) + 1) / courseLessons.length * 100)
        })
        .eq('student_id', session.user.id)
        .eq('course_id', lesson.course_id);

      if (error) throw error;

      // Navigate to next lesson or back to course
      const currentIndex = courseLessons.findIndex(l => l.id === lesson.id);
      const nextLesson = currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null;
      
      if (nextLesson) {
        navigateToLesson(nextLesson.id);
      } else {
        router.back();
      }
    } catch (err: any) {
      console.error('Error marking lesson complete:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading lesson...</Text>
      </View>
    );
  }

  if (error || !lesson) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: colors.error, fontSize: 18, marginBottom: 8 }}>
          {error || 'Lesson not found'}
        </Text>
        <TouchableOpacity onPress={closeLesson} style={styles.backButton}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate navigation
  const currentIndex = courseLessons.findIndex(l => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null;

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
            <View style={styles.lessonHeader}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              {lesson.lesson_type && (
                <View style={styles.lessonTypeBadge}>
                  <Text style={styles.lessonTypeText}>
                    {getLessonTypeIcon(lesson.lesson_type)} {getLessonTypeLabel(lesson.lesson_type)}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.lessonMeta}>
              <Text style={styles.lessonOrder}>Lesson #{lesson.lesson_order}</Text>
              {lesson.duration && (
                <View style={styles.durationContainer}>
                  <Clock size={14} color={colors.textSecondary} />
                  <Text style={styles.duration}>{getLessonDuration(lesson)}</Text>
                </View>
              )}
            </View>

            {lesson.description && (
              <Text style={styles.lessonDescription}>{lesson.description}</Text>
            )}
          </View>

          {/* Video Player (if video lesson) */}
          {lesson.lesson_type === 'video' && lesson.video_url && (
            <View style={styles.videoContainer}>
              <View style={styles.videoPlaceholder}>
                <Play size={48} color={colors.primary} />
                <Text style={styles.videoText}>Video Player</Text>
                <Text style={styles.videoUrl}>{lesson.video_url}</Text>
              </View>
            </View>
          )}

          {/* Lesson Content */}
          <View style={styles.lessonContent}>
            <Text style={styles.contentTitle}>Lesson Content</Text>
            <Text style={styles.contentText}>
              {lesson.content || 'No content available.'}
            </Text>
          </View>

          {/* Resources */}
          {lesson.resources && (
            <View style={styles.resourcesContainer}>
              <Text style={styles.resourcesTitle}>Additional Resources</Text>
              <Text style={styles.resourcesText}>{lesson.resources}</Text>
            </View>
          )}
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
            style={styles.completeButton}
            onPress={markLessonComplete}
          >
            <Text style={styles.completeButtonText}>
              {nextLesson ? 'Complete & Next' : 'Complete Lesson'}
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
    backButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
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
    lessonHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    lessonTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 24,
      color: colors.textPrimary,
      flex: 1,
      marginRight: 12,
    },
    lessonTypeBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    lessonTypeText: {
      fontSize: 12,
      color: colors.primary,
      fontFamily: 'Inter-Medium',
    },
    lessonMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 16,
    },
    lessonOrder: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.textSecondary,
    },
    durationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    duration: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.textSecondary,
    },
    lessonDescription: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    videoContainer: {
      marginBottom: 24,
    },
    videoPlaceholder: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: 32,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.borderLight,
      borderStyle: 'dashed',
    },
    videoText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 8,
    },
    videoUrl: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
    },
    lessonContent: {
      marginBottom: 24,
    },
    contentTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    contentText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textPrimary,
      lineHeight: 24,
    },
    resourcesContainer: {
      backgroundColor: colors.backgroundSecondary,
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
    },
    resourcesTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    resourcesText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
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
      minWidth: 80,
    },
    navButtonText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.primary,
    },
    completeButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      flex: 1,
      marginHorizontal: 16,
      alignItems: 'center',
    },
    completeButtonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      color: colors.background,
    },
    disabledButton: {
      opacity: 0.5,
    },
    disabledButtonText: {
      color: colors.textTertiary,
    },
  });