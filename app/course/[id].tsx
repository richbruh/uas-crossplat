import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, BookOpen, Users, Play, Clock, CheckCircle } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/app/utils/supabase';
import { Course, Lesson, Enrollment } from '@/models';
import { getLessonDuration, getLessonTypeIcon, getLessonTypeLabel } from '@/models/lesson';

// ==================== INTERFACES ====================
interface CourseWithTeacher extends Course {
  profiles?: {
    full_name?: string;
  };
}

// ==================== MAIN COMPONENT ====================
export default function CourseDetailScreen() {
  // ==================== HOOKS ====================
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = getStyles(colors);

  // ==================== STATE ====================
  const [course, setCourse] = useState<CourseWithTeacher | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== COMPUTED VALUES ====================
  const imageUri = course?.thumbnail_url;
  const isEnrolled = !!enrollment;
  const isOwnCourse = course?.teacher_id === session?.user?.id;

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchData();
  }, [id, session]);

  // ==================== DATA FETCHING ====================
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch course with teacher info
      await fetchCourseData();
      
      // Fetch lessons for this course
      const lessonsData = await fetchLessonsData();
      
      // Check enrollment status if user is logged in
      if (session?.user) {
        await checkEnrollmentStatus(lessonsData);
      } else {
        console.log('ℹ️ No session, user not logged in');
        setEnrollment(null);
      }
      
    } catch (err: any) {
      console.error('💥 Error in fetchData:', err);
      setError(err.message || 'Failed to load course');
      setCourse(null);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseData = async () => {
    console.log('🔍 Fetching course data for ID:', id);
    
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select(`*, profiles!teacher_id(full_name)`)
      .eq('id', id)
      .single();

    if (courseError) {
      console.error('❌ Course fetch error:', courseError);
      throw courseError;
    }

    console.log('✅ Course fetched successfully:', courseData.title);
    setCourse(courseData);
  };

  const fetchLessonsData = async () => {
    console.log('🔍 Fetching lessons for course:', id);
    
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', id)
      .order('lesson_order', { ascending: true });
    
    console.log('📚 Lessons Query Result:', {
      courseId: id,
      lessonsCount: lessonsData?.length || 0,
      error: lessonsError
    });

    if (lessonsError) {
      console.error('❌ Lessons fetch error:', lessonsError);
      throw lessonsError;
    }

    console.log('✅ Lessons fetched successfully:', lessonsData?.length || 0, 'lessons');
    setLessons(lessonsData || []);
    return lessonsData || [];
  };

  const checkEnrollmentStatus = async (lessonsData: Lesson[]) => {
    console.log('🔍 Checking enrollment for user:', session?.user?.id);

    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('course_id', id)
      .eq('student_id', session!.user.id)
      .single();
    
    console.log('📊 Enrollment check result:', { 
      hasData: !!enrollmentData, 
      errorCode: enrollmentError?.code 
    });
        
    if (enrollmentData && !enrollmentError) {
      console.log('✅ User is enrolled');
      setEnrollment(enrollmentData);
      await updateProgressIfNeeded(enrollmentData, lessonsData);
    } else if (enrollmentError?.code === 'PGRST116') {
      console.log('ℹ️ User is not enrolled (no rows found)');
      setEnrollment(null);
    } else if (enrollmentError) {
      console.error('❌ Error checking enrollment:', enrollmentError);
      setEnrollment(null);
    }
  };

  // ==================== PROGRESS TRACKING ====================
  const updateProgressIfNeeded = async (enrollmentData: Enrollment, lessonsData: Lesson[]) => {
    try {
      const totalLessons = lessonsData.length;
      if (totalLessons === 0) return;

      const correctProgressPercentage = Math.round((enrollmentData.completed_lessons / totalLessons) * 100);
      
      console.log('📊 Progress calculation:', {
        completedLessons: enrollmentData.completed_lessons,
        totalLessons,
        currentProgress: enrollmentData.progress_percentage,
        correctProgress: correctProgressPercentage
      });

      // Update if there's a mismatch
      if (enrollmentData.progress_percentage !== correctProgressPercentage) {
        console.log('🔄 Updating progress percentage...');
        
        const { data: updatedEnrollment, error: updateError } = await supabase
          .from('enrollments')
          .update({ progress_percentage: correctProgressPercentage })
          .eq('id', enrollmentData.id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Error updating progress:', updateError);
        } else {
          console.log('✅ Progress updated successfully');
          setEnrollment(updatedEnrollment);
        }
      }
    } catch (error) {
      console.error('❌ Error in updateProgressIfNeeded:', error);
    }
  };

  // ==================== PROGRESS HELPERS ====================
  const getCompletedLessonsCount = () => enrollment?.completed_lessons || 0;
  const getTotalLessonsCount = () => lessons.length;
  const getProgressPercentage = () => {
    if (!enrollment || lessons.length === 0) return 0;
    return Math.round((enrollment.completed_lessons / lessons.length) * 100);
  };
  const isLessonCompleted = (lessonOrder: number) => {
    return enrollment ? enrollment.completed_lessons >= lessonOrder : false;
  };
  const getNextIncompleteLesson = () => {
    if (!enrollment) return lessons[0];
    return lessons.find(lesson => lesson.lesson_order > enrollment.completed_lessons) || null;
  };

  // ==================== ENROLLMENT HANDLER ====================
  const handleEnrollment = async () => {
    console.log('🚀 Starting enrollment process...');

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
      console.log('📝 Creating enrollment...');

      const { data, error } = await supabase
        .from('enrollments')
        .insert([{
          student_id: session.user.id,
          course_id: course.id,
          completed_lessons: 0,
          progress_percentage: 0
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Enrollment error:', error);
        
        if (error.code === '23505') {
          Alert.alert('Already Enrolled', 'You are already enrolled in this course.');
          return;
        }
        throw error;
      }

      console.log('✅ Enrollment successful');
      setEnrollment(data);
      
      Alert.alert(
        'Enrollment Successful! 🎉',
        `You have successfully enrolled in "${course.title}". You can now access all course materials.`,
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

  // ==================== NAVIGATION ====================
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)');
    }
  };

  // ==================== LOADING & ERROR STATES ====================
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading course...</Text>
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {error || 'Course not found'}
        </Text>
        <TouchableOpacity onPress={goBack} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==================== DEBUG LOGS ====================
  console.log('🔍 Render Debug:', {
    courseTitle: course.title,
    isOwnCourse,
    isEnrolled,
    hasSession: !!session?.user,
    lessonsCount: lessons.length,
    progressPercentage: getProgressPercentage()
  });

  // ==================== RENDER ====================
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
        {/* Hero Section */}
        <View>
          <Image 
            source={imageUri ? { uri: imageUri } : undefined} 
            style={styles.coverImage} 
          />
          <View style={styles.gradientOverlay} />
        </View>
        
        <SafeAreaView style={styles.content}>
          <Animated.View entering={FadeIn.duration(500)}>
            
            {/* Course Header */}
            <View style={styles.courseHeader}>
              <CourseInfo course={course} lessons={lessons} />
              <EnrollmentSection 
                session={session}
                isOwnCourse={isOwnCourse}
                isEnrolled={isEnrolled}
                enrolling={enrolling}
                enrollment={enrollment}
                lessons={lessons}
                onEnroll={handleEnrollment}
                onContinue={() => {
                  const nextLesson = getNextIncompleteLesson();
                  if (nextLesson) router.push(`/lesson/${nextLesson.id}`);
                }}
                getProgressPercentage={getProgressPercentage}
                getCompletedLessonsCount={getCompletedLessonsCount}
                getTotalLessonsCount={getTotalLessonsCount}
              />
            </View>
            
            {/* Lessons Section */}
            <LessonsSection 
              lessons={lessons}
              enrollment={enrollment}
              isEnrolled={isEnrolled}
              isOwnCourse={isOwnCourse}
              isLessonCompleted={isLessonCompleted}
              onLessonPress={(lessonId) => router.push(`/lesson/${lessonId}`)}
            />
            
          </Animated.View>
        </SafeAreaView>
      </ScrollView>
    </>
  );
}

// ==================== SUB COMPONENTS ====================
interface CourseInfoProps {
  course: CourseWithTeacher;
  lessons: Lesson[];
}

const CourseInfo: React.FC<CourseInfoProps> = ({ course, lessons }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <>
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
    </>
  );
};

interface EnrollmentSectionProps {
  session: any;
  isOwnCourse: boolean;
  isEnrolled: boolean;
  enrolling: boolean;
  enrollment: Enrollment | null;
  lessons: Lesson[];
  onEnroll: () => void;
  onContinue: () => void;
  getProgressPercentage: () => number;
  getCompletedLessonsCount: () => number;
  getTotalLessonsCount: () => number;
}

const EnrollmentSection: React.FC<EnrollmentSectionProps> = ({
  session,
  isOwnCourse,
  isEnrolled,
  enrolling,
  onEnroll,
  onContinue,
  getProgressPercentage,
  getCompletedLessonsCount,
  getTotalLessonsCount
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  if (isOwnCourse) {
    return (
      <View style={styles.enrollmentContainer}>
        <View style={[styles.enrolledIndicator, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
          <Text style={[styles.enrolledText, { color: colors.primary }]}>
            👨‍🏫 You are the instructor
          </Text>
        </View>
      </View>
    );
  }

  if (!session?.user) {
    return (
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
    );
  }

  if (isEnrolled) {
    const progressPercentage = getProgressPercentage();
    
    return (
      <View style={styles.enrollmentContainer}>
        <View style={styles.enrolledIndicator}>
          <View style={styles.enrolledHeader}>
            <Text style={styles.enrolledText}>✓ Enrolled</Text>
            <Text style={styles.progressPercentageText}>
              {progressPercentage}% Complete
            </Text>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${progressPercentage}%` }]} 
              />
            </View>
            <Text style={styles.progressText}>
              {getCompletedLessonsCount()} of {getTotalLessonsCount()} lessons completed
            </Text>
          </View>

          {/* Action Button */}
          {progressPercentage < 100 ? (
            <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
              <Text style={styles.continueButtonText}>
                {progressPercentage === 0 ? 'Start Learning' : 'Continue Learning'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>🎉 Course Completed!</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.enrollmentContainer}>
      <TouchableOpacity 
        style={[styles.enrollButton, enrolling && styles.enrollButtonDisabled]}
        onPress={onEnroll}
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
    </View>
  );
};

interface LessonsSectionProps {
  lessons: Lesson[];
  enrollment: Enrollment | null;
  isEnrolled: boolean;
  isOwnCourse: boolean;
  isLessonCompleted: (order: number) => boolean;
  onLessonPress: (lessonId: string) => void;
}

const LessonsSection: React.FC<LessonsSectionProps> = ({
  lessons,
  enrollment,
  isEnrolled,
  isOwnCourse,
  isLessonCompleted,
  onLessonPress
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
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
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              index={index}
              enrollment={enrollment}
              isAccessible={isEnrolled || isOwnCourse}
              isCompleted={isLessonCompleted(lesson.lesson_order)}
              isNext={enrollment ? lesson.lesson_order === enrollment.completed_lessons + 1 : false}
              onPress={() => onLessonPress(lesson.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

interface LessonItemProps {
  lesson: Lesson;
  index: number;
  enrollment: Enrollment | null;
  isAccessible: boolean;
  isCompleted: boolean;
  isNext: boolean;
  onPress: () => void;
}

const LessonItem: React.FC<LessonItemProps> = ({
  lesson,
  index,
  isAccessible,
  isCompleted,
  isNext,
  onPress
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View 
      style={[
        styles.lessonItem,
        isCompleted && styles.completedLessonItem,
        isNext && styles.nextLessonItem
      ]}
    >
      <View style={styles.lessonNumber}>
        <Text style={styles.lessonNumberText}>{index + 1}</Text>
      </View>
      
      <View style={styles.lessonContent}>
        <View style={styles.lessonHeader}>
          <Text style={[
            styles.lessonTitle,
            isCompleted && styles.completedLessonTitle
          ]}>
            {lesson.title}
          </Text>
          
          <View style={styles.lessonBadges}>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>✓</Text>
              </View>
            )}
            {isNext && !isCompleted && (
              <View style={styles.nextBadge}>
                <Text style={styles.nextBadgeText}>Next</Text>
              </View>
            )}
            {lesson.lesson_type && (
              <View style={styles.lessonTypeBadge}>
                <Text style={styles.lessonTypeText}>
                  {getLessonTypeIcon(lesson.lesson_type)}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {lesson.description && (
          <Text style={[
            styles.lessonDescription,
            isCompleted && styles.completedLessonDescription
          ]} numberOfLines={2}>
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
      
      {/* Action Button */}
      {isAccessible ? (
        <TouchableOpacity 
          style={[
            styles.playButton,
            isCompleted && styles.completedPlayButton
          ]}
          onPress={onPress}
        >
          {isCompleted ? (
            <CheckCircle size={16} color={colors.background} />
          ) : (
            <Play size={16} color={colors.background} />
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.lockedButton}>
          <Text style={styles.lockedText}>🔒</Text>
        </View>
      )}
    </View>
  );
};

// ==================== STYLES ====================
const getStyles = (colors: any) => StyleSheet.create({
  // Base Styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 16,
  },
  errorText: {
    color: colors.error || '#ef4444',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },

  // Header Styles
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

  // Content Styles
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
  
  // Course Info Styles
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

  // Enrollment Styles
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
    borderWidth: 1,
    borderColor: '#10B981',
  },
  enrolledText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#10B981',
  },
  enrolledHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressPercentageText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#10B981',
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.background,
  },
  completedBadge: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  completedBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.background,
  },

  // Lessons Styles
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

  // Lesson Item Styles
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card || colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  completedLessonItem: {
    backgroundColor: '#10B981' + '10',
    borderColor: '#10B981' + '30',
  },
  nextLessonItem: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary + '30',
    borderWidth: 2,
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
  completedLessonTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  lessonBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  nextBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: colors.background,
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
  completedLessonDescription: {
    opacity: 0.6,
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
  completedPlayButton: {
    backgroundColor: '#10B981',
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