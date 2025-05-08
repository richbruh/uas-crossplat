//lesson/[id].tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Video } from 'expo-av';
import { useRef } from 'react';
import { getLessonById, getCourseById, getLessonsByCourseId } from '@/data/courses';
import { useTheme } from '../context/ThemeContext';

export default function LessonScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState({});
  
  const lesson = getLessonById(id);
  
  if (!lesson) {
    return (
      <View style={styles.centerContainer}>
        <Text>Lesson not found</Text>
      </View>
    );
  }
  
  const course = getCourseById(lesson.courseId);
  const courseLessons = getLessonsByCourseId(lesson.courseId);
  
  const lessonIndex = courseLessons.findIndex(l => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? courseLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < courseLessons.length - 1 ? courseLessons[lessonIndex + 1] : null;
  
  const closeLesson = () => {
    router.back();
  };

  const navigateToLesson = (lessonId: string) => {
    router.replace(`/lesson/${lessonId}`);
  };

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

        {lesson.type === 'video' && (
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              style={styles.video}
              source={{ uri: 'https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4' }} // Placeholder video URL
              useNativeControls
              resizeMode="cover"
              isLooping
              onPlaybackStatusUpdate={status => setStatus(status)}
            />
          </View>
        )}

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.lessonInfo}>
            <Text style={styles.lessonTitle}>{lesson.title}</Text>
            <Text style={styles.lessonDuration}>{lesson.duration}</Text>
          </View>
          
          {lesson.type === 'quiz' ? (
            <View style={styles.quizContainer}>
              <Text style={styles.quizTitle}>Module Assessment</Text>
              <Text style={styles.quizDescription}>
                Test your knowledge with this quiz about the material covered in this module.
              </Text>
              
              <View style={styles.questionContainer}>
                <Text style={styles.questionText}>What is the main advantage of using React Native?</Text>
                
                <TouchableOpacity style={styles.answerOption}>
                  <Text style={styles.answerText}>Native performance</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.answerOption, styles.selectedAnswer]}>
                  <Text style={[styles.answerText, styles.selectedAnswerText]}>Cross-platform development</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.answerOption}>
                  <Text style={styles.answerText}>Native UI components</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.answerOption}>
                  <Text style={styles.answerText}>All of the above</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity style={styles.submitButton}>
                <Text style={styles.submitButtonText}>Submit Answer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.lessonContent}>
              <Text style={styles.contentText}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </Text>
              <Text style={styles.contentText}>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </Text>
              <Text style={styles.contentText}>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </Text>
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
            style={[styles.completeButton, lesson.completed && styles.completedButton]}
          >
            <Text style={[styles.completeButtonText, lesson.completed && styles.completedButtonText]}>
              {lesson.completed ? 'Completed' : 'Mark Complete'}
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
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
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
  lessonDuration: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
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
  quizContainer: {
    padding: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    marginBottom: 32,
  },
  quizTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  quizDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  answerOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
    backgroundColor: colors.background,
  },
  selectedAnswer: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  answerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textPrimary,
  },
  selectedAnswerText: {
    fontFamily: 'Inter-Medium',
    color: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
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
  },
  completeButton: {
    backgroundColor: colors.success,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  completeButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.background,
  },
  completedButton: {
    backgroundColor: colors.backgroundSecondary,
  },
  completedButtonText: {
    color: colors.textSecondary,
  },
});
