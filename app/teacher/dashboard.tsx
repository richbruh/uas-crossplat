//untuk teacher dashboard pakai yang ini
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Image
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Plus, BookOpen, Users, Edit, Trash2, Eye, Settings, ChevronRight, FileText, CheckSquare } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// Context and Services
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/app/utils/supabase';

// Types and Models
import { Course, getGradeLevelLabel } from '@/models/course';
import { profile } from '@/models/profile';
import { Lesson } from '@/models/lesson';
import { Exam } from '@/models/Exam';
import { Enrollment } from '@/models/enrollment';

// Components
import MakeCourseForm from '@/components/MakeCourseForm';

// Extended Course type with stats
interface CourseWithStats extends Course {
  student_count: number;
  enrollment_count: number;
  avg_progress: number;
  lesson_count: number;
  exam_exists: boolean;
  published_lessons: number;
  total_duration: number; // in minutes
}

// Screen states
type ViewMode = 'dashboard' | 'createCourse' | 'editCourse';

export default function TeacherCourseDashboard() {
  const { colors } = useTheme();
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<profile | null>(null);
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const styles = getStyles(colors);

  const fetchInitialData = useCallback(async () => {
    if (authLoading) return;

    setLoading(true);
    setError(null);

    if (!session?.user) {
      setError('Authentication required. Please log in.');
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch User Profile & Check Role (Teacher Only)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
      console.error('[TEACHER_DASHBOARD] Profile fetch error:', profileError);
      throw profileError;
    }

      if (!profileData || profileData.role !== 'teacher') {
        setError('Access Denied. This page is for teachers only.');
        setUserProfile(profileData);
        setLoading(false);
        return;
      }
      setUserProfile(profileData);

      // 2. Fetch Courses for Current Teacher with Lesson and Exam Stats
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          *,
          lessons(
            id,
            duration,
            lesson_type,
            lesson_order,
            created_at
          ),
          exams(
            id
          )
        `)
        .eq('teacher_id', session.user.id)
        .order('created_at', { ascending: false });

      if (coursesError) {
        console.error('[TEACHER_DASHBOARD] Courses fetch error:', coursesError);
        throw coursesError;
      }

      console.log('[TEACHER_DASHBOARD] Raw courses data:', coursesData?.length);

  // 3. Process Courses with Enhanced Stats
    const coursesWithFullStats: CourseWithStats[] = await Promise.all(
      (coursesData || []).map(async (course) => {
        console.log(`[TEACHER_DASHBOARD] Processing course: ${course.title}`);

        // Fetch enrollment statistics
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('progress_percentage')
          .eq('course_id', course.id);

        if (enrollmentError) {
          console.error(`Error fetching enrollments for course ${course.id}:`, enrollmentError);
        }

        // ✅ FIXED: Calculate lesson statistics (no is_published field)
        const lessons = course.lessons || [];
        console.log(`[TEACHER_DASHBOARD] Course ${course.title} has ${lessons.length} lessons`);

        // Since is_published doesn't exist, consider all lessons as published
        // Alternative: filter by lesson_type or created_at
        const publishedLessons = lessons.filter((lesson: any) => {
          // For now, consider all lessons as "published"
          return true;
          
          // Alternative options:
          // return lesson.lesson_type !== 'draft';
          // return new Date(lesson.created_at) < new Date(Date.now() - 24*60*60*1000); // 1 day old
        });

        const totalDuration = lessons.reduce((sum: number, lesson: any) => 
          sum + (lesson.duration || 0), 0
        );

        // Calculate enrollment statistics
        const safeEnrollments = enrollments || [];
        const studentCount = safeEnrollments.length;

        const avgProgress = studentCount > 0
          ? Math.round(
              safeEnrollments.reduce((sum, enrollment) => 
                sum + (enrollment.progress_percentage || 0), 0
              ) / studentCount
            )
          : 0;

        const courseStats = {
          ...course,
          student_count: studentCount,
          enrollment_count: studentCount,
          avg_progress: avgProgress,
          lesson_count: lessons.length,
          published_lessons: publishedLessons.length,
          total_duration: totalDuration,
          exam_exists: (course.exams?.length || 0) > 0,
        };

        console.log(`[TEACHER_DASHBOARD] Course ${course.title} stats:`, {
          lessons: courseStats.lesson_count,
          published: courseStats.published_lessons,
          students: courseStats.student_count,
          duration: courseStats.total_duration
        });

        return courseStats;
      })
    );

    console.log('[TEACHER_DASHBOARD] Processed courses:', coursesWithFullStats.length);
    setCourses(coursesWithFullStats);

  } catch (err: any) {
    console.error('Error fetching teacher dashboard data:', err);
    setError(err.message || 'An unexpected error occurred.');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [session, authLoading]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleCourseCreatedOrUpdated = () => {
    setViewMode('dashboard');
    setEditingCourse(null);
    fetchInitialData();
  };

  const handleDeleteCourse = (course: CourseWithStats) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${course.title}"?\n\nThis will permanently remove:\n• ${course.lesson_count} lessons\n• ${course.student_count} student enrollments\n• ${course.exam_exists ? 'Exam data' : 'No exams'}\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Delete course (should cascade delete lessons, exams, enrollments via RLS)
              const { error: deleteError } = await supabase
                .from('courses')
                .delete()
                .eq('id', course.id)
                .eq('teacher_id', session?.user?.id); // Extra security check

              if (deleteError) throw deleteError;

              Alert.alert('Success', 'Course deleted successfully.');
              fetchInitialData();
            } catch (err: any) {
              console.error('Delete course error:', err);
              Alert.alert('Error', err.message || 'Failed to delete course.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInitialData();
  };

  // Navigation Functions
  const navigateToEditCourse = (course: Course) => {
    setEditingCourse(course);
    setViewMode('editCourse');
  };

  const navigateToManageLessons = (courseId: string, courseTitle: string) => {
    router.push({ 
      pathname: '/teacher/manage-lessons', 
      params: { courseId, courseTitle } 
    });
  };

  const navigateToManageExam = (courseId: string, courseTitle: string, examExists: boolean) => {
    router.push({ 
      pathname: '/teacher/manage-exam', 
      params: { 
        courseId, 
        courseTitle, 
        examExists: examExists.toString() 
      } 
    });
  };

  // Render Functions
  if (authLoading || (loading && !refreshing && courses.length === 0 && !error)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {authLoading ? 'Authenticating...' : 'Loading dashboard...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {!error.includes('Access Denied') && (
            <TouchableOpacity style={styles.retryButton} onPress={fetchInitialData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const renderStatsHeader = () => {
    if (courses.length === 0) return null;

    const totalStudents = courses.reduce((sum, course) => sum + course.student_count, 0);
    const totalLessons = courses.reduce((sum, course) => sum + course.lesson_count, 0);
    const totalDuration = courses.reduce((sum, course) => sum + course.total_duration, 0);
    const avgProgressAll = courses.length > 0
      ? Math.round(courses.reduce((sum, course) => sum + course.avg_progress, 0) / courses.length)
      : 0;

    return (
      <Animated.View entering={FadeInUp.duration(500)} style={styles.statsContainer}>
        <View style={styles.statCard}>
          <BookOpen size={24} color={colors.primary} />
          <Text style={styles.statNumber}>{courses.length}</Text>
          <Text style={styles.statLabel}>Courses</Text>
        </View>
        <View style={styles.statCard}>
          <Users size={24} color={colors.success} />
          <Text style={styles.statNumber}>{totalStudents}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statCard}>
          <FileText size={24} color={colors.warning} />
          <Text style={styles.statNumber}>{totalLessons}</Text>
          <Text style={styles.statLabel}>Lessons</Text>
        </View>
        <View style={styles.statCard}>
          <Settings size={24} color={colors.info} />
          <Text style={styles.statNumber}>{avgProgressAll}%</Text>
          <Text style={styles.statLabel}>Avg Progress</Text>
        </View>
      </Animated.View>
    );
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const renderCourseRow = ({ item: course }: { item: CourseWithStats }) => (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.courseRow}>
      <View style={styles.courseInfoContent}>
        <Image 
          source={{ uri: course.thumbnail_url || 'https://via.placeholder.com/120x90' }} 
          style={styles.horizontalImage} 
        />
        <View style={styles.courseTextContent}>
          <Text style={styles.courseTitleText} numberOfLines={2}>
            {course.title}
          </Text>
          <Text style={styles.courseDetailText}>
            {getGradeLevelLabel(course.grade_level)} • {course.published_lessons}/{course.lesson_count} Published
          </Text>
          <Text style={styles.courseDetailText}>
            {course.student_count} Students • {course.avg_progress}% Avg Progress
          </Text>
          {course.total_duration > 0 && (
            <Text style={styles.courseDetailText}>
              Duration: {formatDuration(course.total_duration)}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.courseActionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButtonSmall, styles.editButton]} 
          onPress={() => navigateToEditCourse(course)}
        >
          <Edit size={16} color={colors.background} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButtonSmall, styles.lessonsButton]} 
          onPress={() => navigateToManageLessons(course.id, course.title)}
        >
          <FileText size={16} color={colors.background} />
          <Text style={styles.actionButtonText}>Lessons</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButtonSmall, styles.examButton]} 
          onPress={() => navigateToManageExam(course.id, course.title, course.exam_exists)}
        >
          <CheckSquare size={16} color={colors.background} />
          <Text style={styles.actionButtonText}>Exam</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButtonSmall, styles.deleteButton]} 
          onPress={() => handleDeleteCourse(course)}
        >
          <Trash2 size={16} color={colors.background} />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <BookOpen size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Courses Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first course to start teaching and engaging with students.
      </Text>
      <TouchableOpacity
        style={styles.createFirstButton}
        onPress={() => { setEditingCourse(null); setViewMode('createCourse'); }}
      >
        <Plus size={20} color={colors.background} />
        <Text style={styles.createFirstButtonText}>Create New Course</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDashboard = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Course Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, {userProfile?.full_name || 'Teacher'}!
          </Text>
        </View>
        {courses.length > 0 && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => { setEditingCourse(null); setViewMode('createCourse'); }}
          >
            <Plus size={20} color={colors.background} />
            <Text style={styles.createButtonText}>New Course</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderStatsHeader()}

      {courses.length === 0 && !loading ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourseRow}
          contentContainerStyle={styles.coursesListContainer}
          ListHeaderComponent={
            courses.length > 0 ? (
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.tableHeaderInfo]}>
                  Course Information
                </Text>
                <Text style={[styles.tableHeaderText, styles.tableHeaderActions]}>
                  Actions
                </Text>
              </View>
            ) : null
          }
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );

  // Main render logic
  switch (viewMode) {
    case 'createCourse':
    case 'editCourse':
      return (
        <SafeAreaView style={styles.container}>
          <MakeCourseForm 
            initialCourseData={editingCourse}
            onSuccess={handleCourseCreatedOrUpdated}
            onCancel={() => {
              setViewMode('dashboard');
              setEditingCourse(null);
            }}
          />
        </SafeAreaView>
      );
    default:
      return renderDashboard();
  }
}

// Styles (same as before, with minor adjustments)
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
      padding: 24,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 24 : 48,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    createButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
    },
    createButtonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      color: colors.background,
      marginLeft: 6,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingVertical: 16,
      justifyContent: 'space-around',
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginHorizontal: 4,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    statNumber: {
      fontFamily: 'Inter-Bold',
      fontSize: 18,
      color: colors.textPrimary,
      marginTop: 6,
    },
    statLabel: {
      fontFamily: 'Inter-Medium',
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    coursesListContainer: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    tableHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    tableHeaderText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      color: colors.textSecondary,
    },
    tableHeaderInfo: {
      flex: 3,
    },
    tableHeaderActions: {
      flex: 1,
      textAlign: 'right',
    },
    courseRow: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    courseInfoContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    horizontalImage: {
      width: 80,
      height: 60,
      borderRadius: 6,
      marginRight: 10,
    },
    courseTextContent: {
      flex: 1,
    },
    courseTitleText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    courseDetailText: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 10,
    },
    courseActionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    actionButtonSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 6,
      flex: 1,
      marginHorizontal: 2,
      justifyContent: 'center',
    },
    actionButtonText: {
      fontFamily: 'Inter-Medium',
      fontSize: 11,
      color: colors.background,
      marginLeft: 4,
    },
    editButton: {
      backgroundColor: colors.primary,
    },
    lessonsButton: {
      backgroundColor: colors.success,
    },
    examButton: {
      backgroundColor: colors.warning,
    },
    deleteButton: {
      backgroundColor: colors.error,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      marginTop: 40,
    },
    emptyTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 22,
      color: colors.textPrimary,
      marginTop: 20,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 10,
      lineHeight: 22,
    },
    createFirstButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 24,
    },
    createFirstButtonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.background,
      marginLeft: 8,
    },
    errorText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.error,
      textAlign: 'center',
      marginBottom: 16,
    },
    loadingText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 16,
    },
    retryButtonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.background,
    },
  });