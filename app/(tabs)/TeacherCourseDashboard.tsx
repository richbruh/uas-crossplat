import React, { useEffect, useState } from 'react';
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
  Modal,
  FlatList
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Plus, BookOpen, Users, Edit, Trash2, Eye, Settings } from 'lucide-react-native';

// Context and Services
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/app/utils/supabase';

// Types and Models
import { Course } from '@/models/course';
import { profile } from '@/models/profile';

// Components
import CourseCard from '@/components/CourseCard';
import MakeCourseForm from '@/components/MakeCourseForm';

// Extended Course type with stats
interface CourseWithStats extends Course {
  student_count: number;
  enrollment_count: number;
  avg_progress: number;
}

// Screen states
type ViewMode = 'dashboard' | 'create' | 'edit';

export default function TeacherCourseDashboard() {
  const { colors } = useTheme();
  const { session, loading: authLoading } = useAuth(); // ✅ Add authLoading from context

  
  // State management
  const [userProfile, setUserProfile] = useState<profile | null>(null);
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const styles = getStyles(colors);

// ✅ Debug logging
  useEffect(() => {
    console.log('TeacherCourseDashboard Debug:', {
      session: session ? 'exists' : 'null',
      userId: session?.user?.id,
      authLoading: authLoading ?? 'undefined',
      userProfile: userProfile?.role ?? 'null',
      componentLoading: loading,
      error
    });
  }, [session, authLoading, userProfile, loading, error]);
  // ✅ Wait for auth to complete before checking role
  useEffect(() => {
    console.log('useEffect triggered:', { authLoading, session: !!session });
    
    // Only proceed if auth is not loading
    if (authLoading === false) { // Explicit false check
      checkUserRole();
    }
  }, [session, authLoading]);

  useEffect(() => {
    if (userProfile && (userProfile.role === 'teacher' || userProfile.role === 'admin')) {
      fetchTeacherCourses();
    }
  }, [userProfile]);

 
  // ✅ Fixed checkUserRole function
  const checkUserRole = async () => {
    console.log('checkUserRole called:', { 
      session: !!session, 
      userId: session?.user?.id,
      authLoading 
    });

    // Reset Error state
    setError(null);

    if (!session?.user) {
      console.log('No session or user found');
      setError('Authentication required');
      setLoading(false); // ✅ Important: Stop loading
      return;
    }


    try {
        setLoading(true);
        const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      if (data.role !== 'teacher' && data.role !== 'admin') {
        setError('Access denied. Only teachers and admins can access this page.');
        setLoading(false);
        return;
      }

      setUserProfile(data);
    } catch (err: any) {
      console.error('Error checking user role:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Show Loading Spinner while auth initializes
  if (authLoading === true) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

    // ✅ Show loading while checking user role (only after auth is complete)
  if (loading && !refreshing && !error) {
    console.log('Rendering component loading state');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }
  // ✅ Show error state
  if (error) {
    console.log('Rendering error state:', error);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              checkUserRole();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  // Fetch teacher's courses with statistics
  const fetchTeacherCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch courses created by the teacher
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', session?.user.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Fetch enrollment statistics for each course
      const coursesWithStats: CourseWithStats[] = await Promise.all(
        coursesData.map(async (course) => {
          // Get enrollment count and average progress
          const { data: enrollments, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('progress_percentage')
            .eq('course_id', course.id);

          if (enrollmentError) {
            console.error('Error fetching enrollments:', enrollmentError);
            return {
              ...course,
              student_count: 0,
              enrollment_count: 0,
              avg_progress: 0
            };
          }

          const studentCount = enrollments.length;
          const avgProgress = studentCount > 0 
            ? enrollments.reduce((sum, enrollment) => sum + (enrollment.progress_percentage || 0), 0) / studentCount
            : 0;

          return {
            ...course,
            student_count: studentCount,
            enrollment_count: studentCount,
            avg_progress: Math.round(avgProgress)
          };
        })
      );

      setCourses(coursesWithStats);
    } catch (err: any) {
      console.error('Error fetching courses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle course creation success
  const handleCourseCreated = (newCourse: Course) => {
    setViewMode('dashboard');
    fetchTeacherCourses(); // Refresh the list
  };

  // Handle course deletion
  const handleDeleteCourse = (course: Course) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${course.title}"? This action cannot be undone and will affect all enrolled students.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCourse(course.id)
        }
      ]
    );
  };

  // Delete course from database
  const deleteCourse = async (courseId: string) => {
    try {
      setLoading(true);

      // Delete course (this should cascade delete related enrollments)
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      Alert.alert('Success', 'Course deleted successfully');
      fetchTeacherCourses(); // Refresh the list
    } catch (err: any) {
      console.error('Error deleting course:', err);
      Alert.alert('Error', err.message || 'Failed to delete course');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    fetchTeacherCourses();
  };

  // Render unauthorized access
  const renderUnauthorized = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {error || 'Access denied. Only teachers and admins can access this page.'}
        </Text>
      </View>
    </SafeAreaView>
  );

  // Render loading state
  const renderLoading = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your courses...</Text>
      </View>
    </SafeAreaView>
  );

  // Render statistics header
  const renderStatsHeader = () => {
    const totalStudents = courses.reduce((sum, course) => sum + course.student_count, 0);
    const avgProgressAll = courses.length > 0 
      ? courses.reduce((sum, course) => sum + course.avg_progress, 0) / courses.length
      : 0;

    return (
      <Animated.View entering={FadeInUp.duration(500)} style={styles.statsContainer}>
        <View style={styles.statCard}>
          <BookOpen size={24} color={colors.primary} />
          <Text style={styles.statNumber}>{courses.length}</Text>
          <Text style={styles.statLabel}>Total Courses</Text>
        </View>
        <View style={styles.statCard}>
          <Users size={24} color={colors.success} />
          <Text style={styles.statNumber}>{totalStudents}</Text>
          <Text style={styles.statLabel}>Total Students</Text>
        </View>
        <View style={styles.statCard}>
          <Settings size={24} color={colors.warning} />
          <Text style={styles.statNumber}>{Math.round(avgProgressAll)}%</Text>
          <Text style={styles.statLabel}>Avg Progress</Text>
        </View>
      </Animated.View>
    );
  };

  // Render course item with actions
  const renderCourseItem = ({ item: course }: { item: CourseWithStats }) => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.courseItem}>
      <CourseCard course={course} variant="horizontal" />
      
      {/* Course Stats */}
      <View style={styles.courseStats}>
        <Text style={styles.courseStatText}>
          {course.student_count} students • {course.avg_progress}% avg progress
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.courseActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => {/* Navigate to course details */}}
        >
          <Eye size={16} color={colors.primary} />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => {
            setEditingCourse(course);
            setViewMode('edit');
          }}
        >
          <Edit size={16} color={colors.warning} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteCourse(course)}
        >
          <Trash2 size={16} color={colors.error} />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <BookOpen size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No courses yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first course to start teaching students
      </Text>
      <TouchableOpacity 
        style={styles.createFirstButton}
        onPress={() => setViewMode('create')}
      >
        <Plus size={20} color={colors.background} />
        <Text style={styles.createFirstButtonText}>Create Your First Course</Text>
      </TouchableOpacity>
    </View>
  );

  // Render dashboard content
  const renderDashboard = () => (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Course Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Welcome back, {userProfile?.full_name || 'Teacher'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setViewMode('create')}
        >
          <Plus size={20} color={colors.background} />
          <Text style={styles.createButtonText}>Create Course</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      {courses.length > 0 && renderStatsHeader()}

      {/* Course List */}
      {courses.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourseItem}
          contentContainerStyle={styles.coursesList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );

  // Main render logic
  if (loading && !refreshing) return renderLoading();
  if (error && !userProfile) return renderUnauthorized();

  switch (viewMode) {
    case 'create':
      return (
        <SafeAreaView style={styles.container}>
          <MakeCourseForm
            onSuccess={handleCourseCreated}
            onCancel={() => setViewMode('dashboard')}
          />
        </SafeAreaView>
      );

    case 'edit':
      return (
        <SafeAreaView style={styles.container}>
          <MakeCourseForm
            onSuccess={handleCourseCreated}
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
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 16 : 48,
      paddingBottom: 16,
    },
    headerTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 28,
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 4,
    },
    createButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
    },
    createButtonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      color: colors.background,
      marginLeft: 8,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 24,
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
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginHorizontal: 4,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    statNumber: {
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      color: colors.textPrimary,
      marginTop: 8,
    },
    statLabel: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    coursesList: {
      padding: 16,
    },
    courseItem: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
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
      }),
    },
    courseStats: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 12,
    },
    courseStatText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.textSecondary,
    },
    courseActions: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      flex: 1,
      justifyContent: 'center',
    },
    viewButton: {
      backgroundColor: colors.primary + '20',
    },
    editButton: {
      backgroundColor: colors.warning + '20',
    },
    deleteButton: {
      backgroundColor: colors.error + '20',
    },
    actionButtonText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      marginLeft: 4,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      color: colors.textPrimary,
      marginTop: 16,
    },
    emptySubtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 24,
    },
    createFirstButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 12,
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
    },
    loadingText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 16,
    },
  });