import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  Platform,
  ActivityIndicator 
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

// Components
import SectionHeader from '@/components/SectionHeader';
import CoursesList from '@/components/CoursesList';

// Services and context
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext'; // Fixed import path
import { supabase } from '@/app/utils/supabase';

// Types
import { Course } from '@/models/course';

// Extend Course type to include progress
interface EnrolledCourse extends Course {
  progress: number;
}


// Screen states
type ScreenState = 'loading' | 'error' | 'empty' | 'loaded';

export default function MyLearningScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();

  // State Management
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = getStyles(colors);

  // Effects
  useEffect(() => {
    fetchEnrolledCourses();
  }, [session]);


  // Data Fetching
  const fetchEnrolledCourses = async () => {
    // Skip fetch if user isn't logged in
    if (!session?.user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch enrolled courses from Supabase by joining enrollments with courses
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          progress_percentage,
          courses:course_id(
            id, 
            title, 
            description, 
            thumbnail_url, 
            grade_level,
            total_lessons,
            created_at,
            teacher_id
          )
        `)
        .eq('student_id', session.user.id);

      if (error) throw error;
      
      // Transform the joined data to match EnrolledCourse interface
      const courses: EnrolledCourse[] = data
        .filter((item: any) => item.courses) // Filter out any null courses
        .map((item: any) => ({
          id: item.courses.id,
          title: item.courses.title,
          grade_level: item.courses.grade_level,
          description: item.courses.description,
          thumbnail_url: item.courses.thumbnail_url,
          teacher_id: item.courses.teacher_id,
          total_lessons: item.courses.total_lessons,
          created_at: item.courses.created_at,
          progress: item.progress_percentage
        }));
      
      setEnrolledCourses(courses);
    } catch (err: any) {
      console.error('Error fetching enrolled courses:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


// Helper functions
  const getScreenState = (): ScreenState => {
    if (loading) return 'loading';
    if (error) return 'error';
    if (enrolledCourses.length === 0) return 'empty';
    return 'loaded';
  };

  // Component sections
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Learning</Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.messageText, { marginTop: 16 }]}>
        Loading your courses...
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.centerContainer}>
      <Text style={[styles.messageText, { color: colors.error }]}>
        Error loading courses: {error}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.messageText}>
        You haven't enrolled in any courses yet
      </Text>
    </View>
  );

  const renderCoursesContent = () => (
    <Animated.View entering={FadeInUp.duration(500)} style={styles.content}>
      <SectionHeader title="In Progress" />
      <CoursesList 
        courses={enrolledCourses} 
        horizontal={false} 
      />
    </Animated.View>
  );

  const renderContent = () => {
    const state = getScreenState();

    switch (state) {
      case 'loading':
        return renderLoadingState();
      case 'error':
        return renderErrorState();
      case 'empty':
        return renderEmptyState();
      case 'loaded':
        return renderCoursesContent();
      default:
        return renderLoadingState();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderContent()}
    </SafeAreaView>
  );
}

const getStyles = (colors: typeof import('@/constants/Colors').default.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.textPrimary,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    messageText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });