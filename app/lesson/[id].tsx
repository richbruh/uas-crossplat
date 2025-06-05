import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { Lesson, Course, Enrollment } from '@/models';

export default function LessonScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const styles = getStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetchLessonData();
  }, [id]);

  const fetchLessonData = async ( ) => {
    if(!session?.user) {
      Alert.alert('Error', 'You must be logged in to view lessons.');
      router.back();
      return;
    }

    try {
      setLoading(true);

      // Fetch Lesson by ID
      const { data: lessonData, error: lessonError} = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id)
        .single();

      if (lessonError) throw lessonError;
      setLesson(lessonData);

      // Fetch Course for Lesson
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', lessonData.course_id)
        .single();

        if (courseError) throw courseError;
        setCourse(courseData);

      // Check enrollment
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', lessonData.course_id)
        .eq('student_id', session.user.id)
        .single();

      if (enrollmentError && enrollmentError.code !== 'PGRST116') {
        throw enrollmentError;
      }

      if (!enrollmentData) {
        Alert.alert('Access Denied', 'You must be enrolled in this course to access lessons.');
        router.back();
        return;
      }

      setEnrollment(enrollmentData);

      // Fetch all course lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', lessonData.course_id)
        .order('lesson_order', { ascending: true });

      if (lessonsError) throw lessonsError;
      setCourseLessons(lessonsData || []);

    } catch (error: any) {
      Alert.alert('Error', error.message);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  const handleCompleteLesson = async () => {
    if (!lesson || !enrollment) return;

    setCompleting(true);
    try {
      // Update progress
      const newCompletedLessons = enrollment.completed_lessons + 1;
      const progressPercentage = Math.round((newCompletedLessons / courseLessons.length) * 100);

      const { error } = await supabase
        .from('enrollments')
        .update({
          completed_lessons: newCompletedLessons,
          progress_percentage: progressPercentage
        })
        .eq('id', enrollment.id);

      if (error) throw error;

      Alert.alert('Lesson Completed! 🎉', 'Great job! You can now move to the next lesson.');
      
      // Update local state
      setEnrollment(prev => prev ? {
        ...prev,
        completed_lessons: newCompletedLessons,
        progress_percentage: progressPercentage
      } : null);

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCompleting(false);
    }
  };

 // Replace the render logic after loading check:

if (loading) {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

if (!lesson || !course) {  // ✅ Check both lesson AND course
  return (
    <View style={styles.centerContainer}>
      <Text style={styles.errorText}>Lesson not found</Text>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

// ✅ Now we're guaranteed course is not null below this point
const lessonIndex = courseLessons.findIndex(l => l.id === lesson.id);
const prevLesson = lessonIndex > 0 ? courseLessons[lessonIndex - 1] : null;
const nextLesson = lessonIndex < courseLessons.length - 1 ? courseLessons[lessonIndex + 1] : null;

// ✅ Safe boolean calculation
const isCompleted = enrollment !== null && enrollment.completed_lessons >= lesson.lesson_order;

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
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {course.title}  {/* ✅ Safe: course is guaranteed not null */}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonOrder}>Lesson #{lesson.lesson_order}</Text>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          )}
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
          disabled={!prevLesson}  // ✅ boolean | undefined (correct)
          onPress={() => prevLesson && router.replace(`/lesson/${prevLesson.id}`)}
        >
          <ChevronLeft size={20} color={prevLesson ? colors.primary : colors.textTertiary} />
          <Text style={[styles.navButtonText, !prevLesson && styles.disabledButtonText]}>Previous</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.completeButton, isCompleted && styles.completedButton]}
          disabled={completing || isCompleted}  // ✅ boolean (correct)
          onPress={handleCompleteLesson}
        >
          {completing ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={[styles.completeButtonText, isCompleted && styles.completedButtonText]}>
              {isCompleted ? '✓ Completed' : 'Complete'}
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, !nextLesson && styles.disabledButton]} 
          disabled={!nextLesson}  // ✅ boolean | undefined (correct)
          onPress={() => nextLesson && router.replace(`/lesson/${nextLesson.id}`)}
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
  },completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981' + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  completedText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
  },
  completeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  completedButton: {
    backgroundColor: '#10B981',
  },
  completeButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.background,
  },
  completedButtonText: {
    color: colors.background,
  },
  errorText: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    backButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    backButtonText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.background,
    }
});
