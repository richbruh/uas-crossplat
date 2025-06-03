//course/[id].tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, BookOpen, Plus, Trash2, Check, X } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import LessonListItem from '@/components/LessonListItem';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '@/app/utils/supabase';
import { Course, Lesson } from '@/models';
import MakeLessonForm from '@/components/MakeLessonForm';
import { useAuth } from '../context/AuthContext';

export default function CourseDetailScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'create' | 'edit'>('view');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  const router = useRouter();

  const imageUri = course?.thumbnail_url;
  const isTeacherOrAdmin =
    userRole === 'admin' ||
    (userRole === 'teacher' && course?.teacher_id === session?.user.id);

  useEffect(() => {
    console.log('CourseDetailScreen mounted, course id:', id);
    fetchData();
  }, []);

  // In your CourseDetailScreen.tsx
const fetchData = async () => {
  console.log('Fetching data for course id:', id);
  setError(null);
  
  try {
    // First check if we have a valid session
    if (!session?.user?.id) {
      throw new Error('No user session found');
    }

    // Fetch course data
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (courseError) throw courseError;
    console.log('Fetched course data:', courseData);
    setCourse(courseData);

    // Fetch user profile using the verified session user ID
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)  // Use the verified session user ID
      .single();
    
    if (profileError) throw profileError;
    console.log('Fetched user role:', profileData?.role);
    setUserRole(profileData?.role || null);

    await fetchLessons();
  } catch (err: any) {
    console.error('Error in fetchData:', err.message);
    setError(err.message || 'Failed to load course');
    setCourse(null);
    setLessons([]);
    
    // If there's no session, redirect to login
    if (err.message.includes('No user session found')) {
      router.replace('/(auth)/Login');
    }
  }
};

// Add this useEffect to handle session changes
useEffect(() => {
  if (!session?.user?.id) {
    console.log('No session found, redirecting to login');
    router.replace('/(auth)/Login');
  } else {
    fetchData();
  }
}, [session, id]);
  const fetchLessons = async () => {
    console.log('Fetching lessons for course:', id);
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', id)
      .order('lesson_order', { ascending: true });
    if (lessonsError) throw lessonsError;
    console.log('Fetched lessons:', lessonsData);
    setLessons(lessonsData || []);
  };

  const goBack = () => {
    console.log('Navigating back');
    router.back();
  };

  const handleCreateLesson = () => {
    console.log('handleCreateLesson called');
    if (course && lessons.length >= course.total_lessons) {
      console.warn('Lesson limit reached');
      Alert.alert(
        'Lesson Limit Reached',
        `This course can only have ${course.total_lessons} lessons.`,
        [{ text: 'OK' }]
      );
      return;
    }
    setViewMode('create');
  };

  const handleEditLesson = (lesson: Lesson) => {
    console.log('Editing lesson:', lesson);
    setEditingLesson(lesson);
    setViewMode('edit');
  };

  const handleSuccess = async () => {
    console.log('handleSuccess called');
    await fetchLessons();
    setViewMode('view');
    setEditingLesson(null);
  };

  const handleCancel = () => {
    console.log('handleCancel called');
    setViewMode('view');
    setEditingLesson(null);
  };

  const toggleDeleteMode = () => {
    console.log('Toggling delete mode');
    setDeleteMode(!deleteMode);
    setSelectedLessons([]);
  };

  const toggleSelectLesson = (lessonId: string) => {
    console.log('Toggling select for lesson:', lessonId);
    setSelectedLessons((prev) =>
      prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const deleteSelectedLessons = async () => {
    console.log('Deleting selected lessons:', selectedLessons);
    if (selectedLessons.length === 0) return;

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .in('id', selectedLessons);

      if (error) throw error;

      console.log('Deletion successful');
      await fetchLessons();
      setDeleteMode(false);
      setSelectedLessons([]);
      Alert.alert('Success', 'Selected lessons have been deleted');
    } catch (error: any) {
      console.error('Error deleting lessons:', error.message);
      Alert.alert('Error', error.message || 'Failed to delete lessons');
    }
  };

  if (error || !course) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: colors.error, fontSize: 18, marginBottom: 8 }}>
          {error ? error : 'Course not found'}
        </Text>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <MakeLessonForm
        courseId={course.id}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        existingLesson={viewMode === 'edit' ? editingLesson : undefined}
      />
    );
  }

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
          <Image source={imageUri ? { uri: imageUri } : undefined} style={styles.coverImage} />
          <View style={styles.gradientOverlay} />
        </View>

        <SafeAreaView style={styles.content}>
          <Animated.View entering={FadeIn.duration(500)}>
            <View style={styles.courseHeader}>
              <View style={styles.courseInfo}>
                <Text style={styles.title}>{course.title}</Text>
                <Text style={styles.instructor}>By {course.teacher_id}</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <BookOpen size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>{lessons.length} of {course.total_lessons} lessons</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statText}>Level: {course.grade_level}</Text>
                </View>
              </View>

              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionTitle}>About This Course</Text>
                <Text style={styles.description}>{course.description}</Text>
              </View>
            </View>

            <View style={styles.lessonsContainer}>
              <View style={styles.lessonsHeader}>
                <Text style={styles.lessonsTitle}>Course Content</Text>
                {isTeacherOrAdmin && !deleteMode && (
                  <View style={styles.lessonActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleCreateLesson}
                      disabled={lessons.length >= course.total_lessons}
                    >
                      <Plus size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={toggleDeleteMode}
                    >
                      <Trash2 size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
                {isTeacherOrAdmin && deleteMode && (
                  <View style={styles.deleteActions}>
                    <TouchableOpacity
                      style={[styles.deleteButton, styles.cancelDeleteButton]}
                      onPress={toggleDeleteMode}
                    >
                      <X size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteButton, styles.confirmDeleteButton]}
                      onPress={deleteSelectedLessons}
                      disabled={selectedLessons.length === 0}
                    >
                      <Check size={18} color={selectedLessons.length > 0 ? colors.background : colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {lessons.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.textSecondary }}>No lessons yet.</Text>
                  {isTeacherOrAdmin && (
                    <TouchableOpacity
                      style={styles.createFirstButton}
                      onPress={handleCreateLesson}
                    >
                      <Plus size={20} color={colors.background} />
                      <Text style={styles.createFirstButtonText}>Create First Lesson</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                lessons.map((lesson) => (
                  <LessonListItem
                    key={lesson.id}
                    lesson={lesson}
                    onPress={() => {
                      if (!deleteMode) {
                        console.log('Navigating to lesson:', lesson.id);
                        router.push(`/lesson/${lesson.id}`);
                      }
                    }}
                    onLongPress={() => {
                      if (isTeacherOrAdmin) handleEditLesson(lesson);
                    }}
                    selectable={deleteMode}
                    selected={deleteMode && selectedLessons.includes(lesson.id)}
                    onSelect={() => toggleSelectLesson(lesson.id)}
                  />
                ))
              )}
            </View>
          </Animated.View>
        </SafeAreaView>
      </ScrollView>
    </>
  );
}

const getStyles = (colors: any) =>
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
      width: 100,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
      paddingHorizontal: 16,
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
      justifyContent: 'flex-start',
      marginVertical: 16,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
      gap: 24,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
    },
    statText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 6,
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
    lessonsContainer: {
      paddingHorizontal: 24,
    },
    lessonsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    lessonsTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 20,
      color: colors.textPrimary,
    },
    lessonActions: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      padding: 6,
      borderRadius: 20,
      backgroundColor: colors.backgroundSecondary,
    },
    deleteActions: {
      flexDirection: 'row',
      gap: 8,
    },
    deleteButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelDeleteButton: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmDeleteButton: {
      backgroundColor: colors.error,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 16,
    },
    createFirstButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      gap: 8,
    },
    createFirstButtonText: {
      color: colors.background,
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
    },
  });
