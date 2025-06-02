import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, BookOpen } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import LessonListItem from '@/components/LessonListItem';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '@/app/utils/supabase';
import { Course, Lesson } from '@/models';

export default function CourseDetailScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [showExamModal, setShowExamModal] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const imageUri = course?.thumbnail_url;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch course
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .single();
        if (courseError) throw courseError;
        setCourse(courseData);

        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('course_id', id)
          .order('lesson_order', { ascending: true });
        if (lessonsError) throw lessonsError;
        setLessons(lessonsData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load course');
        setCourse(null);
        setLessons([]);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const goBack = () => {
    router.back();
  };

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
            </View>
            
            <View style={styles.lessonsContainer}>
              <Text style={styles.lessonsTitle}>Course Content</Text>
              {lessons.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>Belum ada lesson.</Text>
              ) : (
                lessons.map((lesson) => (
                  <LessonListItem key={lesson.id} lesson={lesson} />
                ))
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
  lessonsTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 16,
  },
});