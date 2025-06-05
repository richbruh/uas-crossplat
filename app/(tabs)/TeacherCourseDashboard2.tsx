import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Plus, BookOpen, Edit, Trash2, Eye } from 'lucide-react-native';

// Context and Services
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/app/utils/supabase';

// Types and Models
import { Course } from '@/models/course';

// Components
import CourseCard from '@/components/CourseCard';
import MakeCourseForm from '@/components/MakeCourseForm';
import { useRouter } from 'expo-router';

interface CourseWithStats extends Course {
  student_count: number;
  avg_progress: number;
}

type ViewMode = 'dashboard' | 'create' | 'edit';

export default function TeacherCourseDashboard() {
  const { colors } = useTheme();
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  // Enhanced session logging
  useEffect(() => {
    console.log('[TeacherDashboard] Initializing component...');
    console.log('[TeacherDashboard] Auth loading state:', authLoading);
    
    if (authLoading) {
      console.log('[TeacherDashboard] Authentication still loading...');
    } else {
      console.log('[TeacherDashboard] Authentication loading complete');
      if (session) {
        console.log('[TeacherDashboard] User session details:', {
          userId: session.user?.id,
          email: session.user?.email,
          role: session.user?.user_metadata?.role,
          isAuthenticated: !!session.user,
          accessToken: session.access_token ? 'exists' : 'missing',
          expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none'
        });
        
        // Log additional Supabase session details
        supabase.auth.getSession().then(({ data: { session } }) => {
          console.log('[Supabase] Current session from getSession():', session);
        });
        
        supabase.auth.getUser().then(({ data: { user } }) => {
          console.log('[Supabase] Current user from getUser():', user);
        });
      } else {
        console.log('[TeacherDashboard] No user session found');
        router.replace('/(auth)/Login');
      }
    }
  }, [authLoading, session]);

  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const styles = getStyles(colors);

  const fetchCourses = async () => {
    try {
      console.log('[COURSES] Fetching courses...');
      console.log('[COURSES] Current session user ID:', session?.user?.id);
      
      setLoading(true);
      setError(null);

      // Log before making the query
      console.log('[COURSES] Making supabase query to fetch courses...');
      
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (coursesError) {
        console.error('[COURSES] Error fetching courses:', coursesError);
        throw coursesError;
      }

      console.log('[COURSES] Successfully fetched', coursesData?.length, 'courses');
      
      // Get enrollment stats for each course
      const coursesWithStats = await Promise.all(
        coursesData.map(async (course) => {
          console.log(`[COURSES] Fetching stats for course ${course.id}`);
          
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('progress_percentage')
            .eq('course_id', course.id);

          if (enrollmentsError) {
            console.error(`[COURSES] Error fetching enrollments for course ${course.id}:`, enrollmentsError);
            throw enrollmentsError;
          }

          const studentCount = enrollments?.length || 0;
          const avgProgress = studentCount > 0 
            ? Math.round(enrollments!.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / studentCount)
            : 0;

          console.log(`[COURSES] Course ${course.id} stats:`, {
            studentCount,
            avgProgress
          });

          return {
            ...course,
            student_count: studentCount,
            avg_progress: avgProgress
          };
        })
      );

      setCourses(coursesWithStats);
      console.log('[COURSES] Courses state updated with stats');
    } catch (err: any) {
      console.error('[ERROR] fetchCourses:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError(err.message);
    } finally {
      console.log('[COURSES] Fetch completed, setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCourseCreated = () => {
    console.log('[COURSES] Course created, refreshing dashboard');
    setViewMode('dashboard');
    fetchCourses();
  };

  const handleDeleteCourse = async (course: Course) => {
    console.log(`[COURSES] Attempting to delete course ${course.id}`);
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${course.title}"?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log('Deletion canceled') },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`[COURSES] Deleting course ${course.id}...`);
              const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', course.id);

              if (error) {
                console.error(`[COURSES] Error deleting course ${course.id}:`, error);
                throw error;
              }
              
              console.log(`[COURSES] Course ${course.id} deleted successfully`);
              fetchCourses();
            } catch (err: any) {
              console.error('[ERROR] handleDeleteCourse:', err);
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  const handleRefresh = () => {
    console.log('[COURSES] Manual refresh triggered');
    setRefreshing(true);
    fetchCourses();
  };

  const handleViewCourse = (courseId: string) => {
    console.log(`[NAVIGATION] Navigating to course ${courseId}`);
    router.push(`/courses/${courseId}`);
  };

  useEffect(() => {
    console.log('[TeacherDashboard] Component mounted, fetching courses...');
    fetchCourses();
    
    // Set up Supabase auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Supabase] Auth state changed:', {
        event,
        session: session ? 'exists' : 'null',
        user: session?.user?.email
      });
      
      if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out, redirecting to login');
        router.replace('/(auth)/Login');
      }
    });

    return () => {
      console.log('[TeacherDashboard] Component unmounting, removing auth listener');
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const renderCourseItem = ({ item }: { item: CourseWithStats }) => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.courseItem}>
      <CourseCard course={item} variant="horizontal" />
      <View style={styles.courseStats}>
        <Text style={styles.courseStatText}>
          {item.student_count} {item.student_count === 1 ? 'student' : 'students'} • {item.avg_progress}% avg progress
        </Text>
      </View>
      <View style={styles.courseActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleViewCourse(item.id)}
        >
          <Eye size={16} color={colors.primary} />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => {
            console.log(`[COURSES] Editing course ${item.id}`);
            setEditingCourse(item);
            setViewMode('edit');
          }}
        >
          <Edit size={16} color={colors.warning} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteCourse(item)}
        >
          <Trash2 size={16} color={colors.error} />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <BookOpen size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No courses yet</Text>
      <Text style={styles.emptySubtitle}>Create your first course to get started</Text>
      <TouchableOpacity 
        style={styles.createFirstButton}
        onPress={() => {
          console.log('[COURSES] Creating new course from empty state');
          setViewMode('create');
        }}
      >
        <Plus size={20} color={colors.background} />
        <Text style={styles.createFirstButtonText}>Create Course</Text>
      </TouchableOpacity>
    </View>
  );

  if (viewMode === 'create') {
    return (
      <MakeCourseForm
        onSuccess={handleCourseCreated}
        onCancel={() => {
          console.log('[COURSES] Course creation canceled');
          setViewMode('dashboard');
        }}
      />
    );
  }

  if (viewMode === 'edit' && editingCourse) {
    return (
      <MakeCourseForm
        course={editingCourse}
        onSuccess={handleCourseCreated}
        onCancel={() => {
          console.log('[COURSES] Course editing canceled');
          setViewMode('dashboard');
          setEditingCourse(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Course Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {session?.user ? `Welcome, ${session.user.email}` : 'Manage your courses'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => {
            console.log('[COURSES] Creating new course from header button');
            setViewMode('create');
          }}
        >
          <Plus size={20} color={colors.background} />
          <Text style={styles.createButtonText}>New Course</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchCourses}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourseItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.coursesList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyState()}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
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
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 48,
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
  coursesList: {
    padding: 16,
    flexGrow: 1,
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
