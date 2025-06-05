import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, BookOpen, Users, Play, Clock } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/app/utils/supabase';
import { Course, Lesson, Enrollment } from '@/models';
import { getLessonDuration, getLessonTypeIcon, getLessonTypeLabel } from '@/models/lesson';

interface CourseWithTeacher extends Course {
  profiles?: {
    full_name?: string;
  };
}

export default function CourseDetailScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();

  // Add Debug Logs
  console.log('🔍 Debug Auth:', {
    session: session,
    user: session?.user,
    hasUser: !!session?.user,
    userId: session?.user?.id
  });

  const styles = getStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [course, setCourse] = useState<CourseWithTeacher | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const imageUri = course?.thumbnail_url;

  useEffect(() => {
    fetchData();
  }, [id, session]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch course with teacher info
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`*, profiles!teacher_id(full_name)`)
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch lessons for this course
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', id)
        .order('lesson_order', { ascending: true });
      
      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);

      // Check if user is enrolled (only if logged in)
      if (session?.user) {
          console.log('🔍 Checking enrollment for user:', session.user.id);

        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('*')
          .eq('course_id', id)
          .eq('student_id', session.user.id)
          .single();
        
          console.log('📊 Enrollment check result:', { 
            data: enrollmentData, 
            error: enrollmentError,
            errorCode: enrollmentError?.code 
          });
          
        // Don't throw error if no enrollment found (user not enrolled)
        if (enrollmentData && !enrollmentError) {
          console.log('✅ User is enrolled');
          setEnrollment(enrollmentData);
        } else if (enrollmentError?.code === 'PGRST116') {
          console.log('ℹ️ User is not enrolled (no rows found)');
          setEnrollment(null);
        } else if (enrollmentError) {
          console.error('❌ Error checking enrollment:', enrollmentError);
          setEnrollment(null); // Assume not enrolled on error
        }
      } else {
        console.log('ℹ️ No session, user not logged in');
        setEnrollment(null);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to load course');
      setCourse(null);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

const handleEnrollment = async () => {
  console.log('🚀 Starting enrollment process...');
  console.log('Session:', session?.user?.id);
  console.log('Course ID:', course?.id);

  if (!session?.user) {
    console.log('❌ No session found');
    Alert.alert(
      'Login Required',
      'You need to login to enroll in this course.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/Login') }
      ]
    );
    return;
  }

  if (!course) {
    console.log('❌ No course found');
    return;
  }

  setEnrolling(true);
  try {
    console.log('📝 Inserting enrollment:', {
      student_id: session.user.id,
      course_id: course.id,
      completed_lessons: 0,
      progress_percentage: 0
    });

    const { data, error } = await supabase
      .from('enrollments')
      .insert([
        {
          student_id: session.user.id,
          course_id: course.id,
          completed_lessons: 0,
          progress_percentage: 0
        }
      ])
      .select()
      .single();

    console.log('📊 Supabase response:', { data, error });

    if (error) {
      console.error('❌ Supabase error:', error);
      
      // Handle duplicate enrollment
      if (error.code === '23505') {
        Alert.alert('Already Enrolled', 'You are already enrolled in this course.');
        return;
      }
      throw error;
    }

    console.log('✅ Enrollment successful:', data);
    setEnrollment(data);
    
    // Success notification
    Alert.alert(
      'Enrollment Successful! 🎉',
      `You have successfully enrolled in "${course.title}". You can now access all course materials in your My Learning section.`,
      [
        { text: 'Continue Learning', onPress: () => router.push('/(tabs)/my-learning') },
        { text: 'Stay Here', style: 'cancel' }
      ]
    );

  } catch (err: any) {
    console.error('💥 Enrollment error:', err);
    Alert.alert('Enrollment Failed', err.message || 'Failed to enroll in course. Please try again.');
  } finally {
    setEnrolling(false);
  }
};

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Ganti dengan route yang valid
      router.push('/(tabs)'); // Main tabs page
    }
  };
  // If loading, show a loading indicator
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: colors.error, fontSize: 18, marginBottom: 8 }}>
          {error ? error : 'Course not found'}
        </Text>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={{ color: colors.primary }}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isEnrolled = !!enrollment;
  const isOwnCourse = course.teacher_id === session?.user?.id;

  // ADD DEBUG LOGS HERE
console.log('🔍 Enrollment Debug:', {
  courseId: course.id,
  courseTitle: course.title,
  teacherId: course.teacher_id,
  currentUserId: session?.user?.id,
  isOwnCourse: isOwnCourse,
  enrollment: enrollment,
  isEnrolled: isEnrolled,
  hasSession: !!session?.user
});

console.log('🎯 Button Visibility Logic:', {
  shouldShowEnrollButton: !isOwnCourse && !isEnrolled,
  isOwnCourse,
  isEnrolled
});
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
              <Text style={styles.instructor}>
                By {course.profiles?.full_name || 'Unknown Teacher'}
              </Text>           
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <BookOpen size={16} color={colors.textSecondary} />
                <Text style={styles.statText}>{lessons.length} lessons</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statText}>Level: {course.grade_level}</Text>
              </View>
            </View>
            
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>About This Course</Text>
              <Text style={styles.description}>{course.description}</Text>
            </View>

            {/* Enrollment Button - Always show if user is logged in and not own course */}
            {session?.user && !isOwnCourse && (
              <View style={styles.enrollmentContainer}>
                {isEnrolled ? (
                  <View style={styles.enrolledIndicator}>
                    <Text style={styles.enrolledText}>✓ Enrolled</Text>
                    {enrollment && (
                      <Text style={styles.progressText}>
                        Progress: {Math.round(enrollment.progress_percentage || 0)}%
                      </Text>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.enrollButton, enrolling && styles.enrollButtonDisabled]}
                    onPress={handleEnrollment}
                    disabled={enrolling}
                  >
                    {enrolling ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <>
                        <Users size={20} color={colors.background} />
                        <Text style={styles.enrollButtonText}>Enroll Now</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Show login prompt if not logged in */}
            {!session?.user && (
              <View style={styles.enrollmentContainer}>
                <TouchableOpacity 
                  style={styles.enrollButton}
                  onPress={() => {
                    Alert.alert(
                      'Login Required',
                      'You need to login to enroll in this course.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Login', onPress: () => router.push('/(auth)/Login') }
                      ]
                    );
                  }}
                >
                  <Users size={20} color={colors.background} />
                  <Text style={styles.enrollButtonText}>Login to Enroll</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Show message if it's own course */}
            {isOwnCourse && (
              <View style={styles.enrollmentContainer}>
                <View style={[styles.enrolledIndicator, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.enrolledText, { color: colors.primary }]}>
                    👨‍🏫 You are the instructor
                  </Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Lessons Section */}
          <View style={styles.lessonsContainer}>
            <Text style={styles.lessonsTitle}>Course Content</Text>
            {lessons.length === 0 ? (
              <View style={styles.emptyLessonsContainer}>
                <Text style={styles.emptyLessonsText}>No lessons available yet.</Text>
                <Text style={styles.emptyLessonsSubtext}>
                  The instructor is still preparing the course materials.
                </Text>
              </View>
            ) : (
              <View style={styles.lessonsListContainer}>
                {lessons.map((lesson, index) => (
                  <View key={lesson.id} style={styles.lessonItem}>
                    <View style={styles.lessonNumber}>
                      <Text style={styles.lessonNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.lessonContent}>
                      <View style={styles.lessonHeader}>
                        <Text style={styles.lessonTitle}>{lesson.title}</Text>
                        {lesson.lesson_type && (
                          <View style={styles.lessonTypeBadge}>
                            <Text style={styles.lessonTypeText}>
                              {getLessonTypeIcon(lesson.lesson_type)}
                            </Text>
                          </View>
                        )}
                      </View>
                      {lesson.description && (
                        <Text style={styles.lessonDescription} numberOfLines={2}>
                          {lesson.description}
                        </Text>
                      )}
                      <View style={styles.lessonMeta}>
                        {lesson.duration && (
                          <View style={styles.durationContainer}>
                            <Clock size={12} color={colors.textSecondary} />
                            <Text style={styles.lessonDuration}>
                              {getLessonDuration(lesson)}
                            </Text>
                          </View>
                        )}
                        {lesson.lesson_type && (
                          <Text style={styles.lessonType}>
                            {getLessonTypeLabel(lesson.lesson_type)}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isEnrolled && (
                      <TouchableOpacity 
                        style={styles.playButton}
                        onPress={() => {
                          router.push(`/lesson/${lesson.id}`);
                        }}
                      >
                        <Play size={16} color={colors.background} />
                      </TouchableOpacity>
                    )}
                    {!isEnrolled && (
                      <View style={styles.lockedButton}>
                        <Text style={styles.lockedText}>🔒</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </SafeAreaView>
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
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    coverImage: {
      width: '100%',
      height: 240,
      resizeMode: 'cover',
      backgroundColor: colors.backgroundSecondary,
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
      marginBottom: 24,
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
    enrollmentContainer: {
      marginTop: 16,
    },
    enrollButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      gap: 8,
    },
    enrollButtonDisabled: {
      opacity: 0.6,
    },
    enrollButtonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.background,
    },
    enrolledIndicator: {
      backgroundColor: '#10B981' + '20',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#10B981',
    },
    enrolledText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: '#10B981',
    },
    progressText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
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
    emptyLessonsContainer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyLessonsText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    emptyLessonsSubtext: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      opacity: 0.7,
    },
    lessonsListContainer: {
      gap: 12,
    },
    lessonItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card || colors.background,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    lessonNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    lessonNumberText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      color: colors.background,
    },
    lessonContent: {
      flex: 1,
    },
    lessonHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    lessonTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.textPrimary,
      flex: 1,
    },
    lessonTypeBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      marginLeft: 8,
    },
    lessonTypeText: {
      fontSize: 12,
      color: colors.primary,
    },
    lessonDescription: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    lessonMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    durationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    lessonDuration: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.textSecondary,
    },
    lessonType: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.primary,
      textTransform: 'capitalize',
    },
    playButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    lockedButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.textTertiary + '30',
      justifyContent: 'center',
      alignItems: 'center',
    },
    lockedText: {
      fontSize: 16,
    },
  });