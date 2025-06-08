// lesson/[id].tsx - Enhanced dengan Quiz Submission
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Camera,
  Upload,
  FileText,
  Clock
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { Lesson, Course, Enrollment } from '@/models';
import { getLessonTypeIcon, getLessonTypeLabel } from '@/models/lesson';
import { Submission, createSubmissionPayload, getSubmissionStatus, isQuizLesson } from '@/models/Submission';

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

  // ✅ Quiz submission states
  const [showQuizSubmission, setShowQuizSubmission] = useState(false);
  const [submissionPhoto, setSubmissionPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);

  useEffect(() => {
    fetchLessonData();
  }, [id]);

  // ✅ Check for existing submission when lesson is quiz
  useEffect(() => {
    if (lesson?.lesson_type === 'quiz' && session?.user?.id) {
      checkExistingSubmission();
    }
  }, [lesson]);

  const fetchLessonData = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'You must be logged in to view lessons.');
      router.back();
      return;
    }

    try {
      setLoading(true);

      // Fetch Lesson by ID
      const { data: lessonData, error: lessonError } = await supabase
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
  };

  // ✅ Check existing quiz submission
const checkExistingSubmission = async () => {
  if (!lesson || !isQuizLesson(lesson) || !session?.user?.id) return;

  try {
    const { data: submissionData, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('lesson_id', lesson.id) // Direct reference to lesson
      .eq('student_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking submission:', error);
      return;
    }

    if (submissionData) {
      setExistingSubmission(submissionData);
      console.log('✅ Found existing submission:', submissionData.id);
    }
  } catch (error) {
    console.error('Error checking existing submission:', error);
  }
};

  // ✅ Handle quiz submission with camera
  const handleQuizSubmission = async () => {
    if (!lesson || lesson.lesson_type !== 'quiz') return;

    Alert.alert(
      'Submit Quiz Answer',
      'Take a photo of your quiz answer sheet',
      [
        {
          text: 'Camera',
          onPress: () => takeQuizPhoto('camera'),
        },
        {
          text: 'Gallery',
          onPress: () => takeQuizPhoto('library'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // ✅ Take quiz photo
  const takeQuizPhoto = async (source: 'camera' | 'library') => {
    try {
      let result;

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Camera access is needed to submit quiz answers.');
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4], // Good for document photos
          quality: 0.9, // High quality for OCR
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Photo library access is needed.');
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.9,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setSubmissionPhoto(result.assets[0].uri);
        setShowQuizSubmission(true);
      }
    } catch (error) {
      console.error('Error taking quiz photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  // ✅ Submit quiz answer
const submitQuizAnswer = async () => {
  if (!submissionPhoto || !lesson || !session?.user?.id || !isQuizLesson(lesson)) return;

  try {
    setSubmitting(true);
    console.log('📤 Submitting quiz answer for lesson:', lesson.id);

    // Upload photo to Supabase Storage
    const response = await fetch(submissionPhoto);
    const blob = await response.blob();
    
    const fileName = `${session.user.id}/${lesson.id}-${Date.now()}.jpg`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('quiz-submissions')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('quiz-submissions')
      .getPublicUrl(fileName);

    // Create submission using helper function
    const submissionPayload = createSubmissionPayload({
      student_id: session.user.id,
      lesson_id: lesson.id, // Direct lesson reference
      photo_url: publicUrl,
    });

    console.log('💾 Creating submission record:', submissionPayload);

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .upsert(submissionPayload, {
        onConflict: 'student_id,lesson_id', // Updated conflict resolution
      })
      .select()
      .single();

    if (submissionError) {
      console.error('❌ Submission error:', submissionError);
      throw new Error(`Submission failed: ${submissionError.message}`);
    }

    console.log('✅ Quiz submission successful:', submission.id);

    Alert.alert(
      'Quiz Submitted! 🎉',
      'Your quiz answer has been submitted successfully. Your teacher will review and grade it soon.',
      [
        {
          text: 'OK',
          onPress: () => {
            setShowQuizSubmission(false);
            setSubmissionPhoto(null);
            checkExistingSubmission();
          },
        },
      ]
    );

  } catch (error: any) {
    console.error('❌ Quiz submission error:', error);
    Alert.alert('Submission Error', error.message);
  } finally {
    setSubmitting(false);
  }
};
// Helper function to decode base64 (keep existing)
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const handleCompleteLesson = async () => {
  if (!lesson || !enrollment) return;

  // ✅ For quiz lessons, require submission first
  if (isQuizLesson(lesson) && !existingSubmission) {
    Alert.alert(
      'Submit Quiz First',
      'You need to submit your quiz answer before completing this lesson.',
      [
        {
          text: 'Submit Now',
          onPress: handleQuizSubmission,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
    return;
  }

  // Rest of completion logic remains the same...
  setCompleting(true);
  try {
    const newCompletedLessons = enrollment.completed_lessons + 1;
    const progressPercentage = Math.round((newCompletedLessons / courseLessons.length) * 100);

    const { error } = await supabase
      .from('enrollments')
      .update({
        completed_lessons: newCompletedLessons,
        progress_percentage: progressPercentage,
      })
      .eq('id', enrollment.id);

    if (error) throw error;

    Alert.alert('Lesson Completed! 🎉', 'Great job! You can now move to the next lesson.');

    setEnrollment((prev) =>
      prev
        ? {
            ...prev,
            completed_lessons: newCompletedLessons,
            progress_percentage: progressPercentage,
          }
        : null
    );
  } catch (error: any) {
    Alert.alert('Error', error.message);
  } finally {
    setCompleting(false);
  }
};


  // Loading and error states...
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!lesson || !course) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Lesson not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lessonIndex = courseLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? courseLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < courseLessons.length - 1 ? courseLessons[lessonIndex + 1] : null;
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
            {course.title}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.lessonInfo}>
            {/* ✅ Lesson type indicator */}
            <View style={styles.lessonTypeContainer}>
              <Text style={styles.lessonTypeIcon}>
                {getLessonTypeIcon(lesson.lesson_type)}
              </Text>
              <Text style={styles.lessonTypeLabel}>
                {getLessonTypeLabel(lesson.lesson_type)}
              </Text>
            </View>

            <Text style={styles.lessonTitle}>{lesson.title}</Text>
            <Text style={styles.lessonOrder}>Lesson #{lesson.lesson_order}</Text>
            
            {isCompleted && (
              <View style={styles.completedBadge}>
                <CheckCircle size={16} color="#10B981" />
                <Text style={styles.completedText}>Completed</Text>
              </View>
            )}

            {/* ✅ Quiz submission status */}
            {lesson.lesson_type === 'quiz' && (
              <View style={styles.quizStatusContainer}>
                {existingSubmission ? (
                  <View style={styles.submissionStatus}>
                    <CheckCircle size={16} color="#10B981" />
                    <Text style={styles.submissionStatusText}>
                      Quiz Submitted {existingSubmission.grade ? `- Grade: ${existingSubmission.grade}` : '- Pending Review'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.submissionStatus}>
                    <Clock size={16} color="#f59e0b" />
                    <Text style={[styles.submissionStatusText, { color: '#f59e0b' }]}>
                      Quiz Not Submitted
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.lessonContent}>
            <Text style={styles.contentText}>
              {lesson.content || 'No content available.'}
            </Text>
          </View>

          {/* ✅ Quiz submission button */}

          {isQuizLesson(lesson) && !existingSubmission && (
            <TouchableOpacity
              style={styles.quizSubmissionButton}
              onPress={handleQuizSubmission}
            >
              <Camera size={20} color={colors.background} />
              <Text style={styles.quizSubmissionButtonText}>Submit Quiz Answer</Text>
            </TouchableOpacity>
          )}
          {/* Update status display */}
          {isQuizLesson(lesson) && (
            <View style={styles.quizStatusContainer}>
              {existingSubmission ? (
                <View style={styles.submissionStatus}>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={styles.submissionStatusText}>
                    Quiz Submitted {existingSubmission.grade ? `- Grade: ${existingSubmission.grade}` : '- Pending Review'}
                  </Text>
                </View>
              ) : (
                <View style={styles.submissionStatus}>
                  <Clock size={16} color="#f59e0b" />
                  <Text style={[styles.submissionStatusText, { color: '#f59e0b' }]}>
                    Quiz Not Submitted
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, !prevLesson && styles.disabledButton]}
            disabled={!prevLesson}
            onPress={() => prevLesson && router.replace(`/lesson/${prevLesson.id}`)}
          >
            <ChevronLeft size={20} color={prevLesson ? colors.primary : colors.textTertiary} />
            <Text style={[styles.navButtonText, !prevLesson && styles.disabledButtonText]}>
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.completeButton, isCompleted && styles.completedButton]}
            disabled={completing || isCompleted}
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
            disabled={!nextLesson}
            onPress={() => nextLesson && router.replace(`/lesson/${nextLesson.id}`)}
          >
            <Text style={[styles.navButtonText, !nextLesson && styles.disabledButtonText]}>
              Next
            </Text>
            <ChevronRight size={20} color={nextLesson ? colors.primary : colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* ✅ Quiz Submission Modal */}
        <Modal
          visible={showQuizSubmission}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Quiz Answer</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowQuizSubmission(false);
                  setSubmissionPhoto(null);
                }}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {submissionPhoto && (
                <View style={styles.photoPreview}>
                  <Image source={{ uri: submissionPhoto }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={() => setSubmissionPhoto(null)}
                  >
                    <Text style={styles.retakeButtonText}>Retake Photo</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.submissionInstructions}>
                <FileText size={24} color={colors.primary} />
                <Text style={styles.instructionsTitle}>Submission Guidelines</Text>
                <Text style={styles.instructionsText}>
                  • Make sure your handwriting is clear and legible
                  {'\n'}• Ensure good lighting when taking the photo
                  {'\n'}• Include all pages of your answer
                  {'\n'}• Write your name on the answer sheet
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowQuizSubmission(false);
                  setSubmissionPhoto(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  (!submissionPhoto || submitting) && styles.modalSubmitButtonDisabled,
                ]}
                onPress={submitQuizAnswer}
                disabled={!submissionPhoto || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <>
                    <Upload size={18} color={colors.background} />
                    <Text style={styles.modalSubmitButtonText}>Submit Answer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
    // ✅ New quiz-specific styles
    lessonTypeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      alignSelf: 'flex-start',
      marginBottom: 12,
      gap: 6,
    },
    lessonTypeIcon: {
      fontSize: 16,
    },
    lessonTypeLabel: {
      fontSize: 12,
      fontFamily: 'Inter-SemiBold',
      color: colors.primary,
    },
    quizStatusContainer: {
      marginTop: 12,
    },
    submissionStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      gap: 8,
    },
    submissionStatusText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: '#10B981',
    },
    quizSubmissionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      marginTop: 20,
      gap: 8,
    },
    quizSubmissionButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.background,
    },
    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: colors.textPrimary,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalContent: {
      flex: 1,
      padding: 20,
    },
    photoPreview: {
      alignItems: 'center',
      marginBottom: 24,
    },
    previewImage: {
      width: '100%',
      height: 300,
      borderRadius: 12,
      marginBottom: 12,
    },
    retakeButton: {
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    retakeButtonText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: colors.textPrimary,
    },
    submissionInstructions: {
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      padding: 20,
      borderRadius: 16,
    },
    instructionsTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.textPrimary,
      marginTop: 12,
      marginBottom: 8,
    },
    instructionsText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    modalActions: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
    },
    modalCancelButton: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalCancelButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.textPrimary,
    },
    modalSubmitButton: {
      flex: 2,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    modalSubmitButtonDisabled: {
      opacity: 0.5,
    },
    modalSubmitButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.background,
    },
    // ... rest of existing styles
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
      borderTopColor: colors.border,
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
    completedBadge: {
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
    },
  });