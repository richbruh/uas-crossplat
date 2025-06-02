import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import SectionHeader from '@/components/SectionHeader';
import CoursesList from '@/components/CoursesList';
import SearchBar from '@/components/SearchBar';
import CategoryScroll from '@/components/CategoryScroll';
import { fetchCourses } from '@/data/courses';
import { useTheme } from '../context/ThemeContext';
import { Course } from '@/models';
import { supabase } from '@/app/utils/supabase';

const categories = ['All', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [error, setError] = useState<string | null>(null);

  // Fetch courses with error handling
  const fetchAllCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCourses();
      setCourses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCourses();
  }, []);

  // Filter courses berdasarkan kategori & search
  const filteredCourses = courses.filter((course: any) => {
    const matchCategory =
      selectedCategory === 'All' ||
      selectedCategory === `Grade ${course.grade_level}`;
    const matchSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description &&
        course.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  // Section: Enrolled, Recent, Comprehensive
  const enrolledCourses = filteredCourses.filter((c: any) => c.enrolled);
  const recentCourses = [...filteredCourses]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);
  const comprehensiveCourses = [...filteredCourses]
    .sort((a, b) => (b.total_lessons || 0) - (a.total_lessons || 0))
    .slice(0, 4);

  const clearSearch = () => setSearchQuery('');

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchAllCourses}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.headerTitle}>Explore Courses</Text>
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={clearSearch}
        />

        {/* Category Filter */}
        <CategoryScroll
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Enrolled Courses */}
        {enrolledCourses.length > 0 && (
          <Animated.View entering={FadeInDown.delay(50).duration(500)}>
            <SectionHeader
              title="My Courses"
              showSeeAll
              onPressSeeAll={() => {}}
            />
            <CoursesList courses={enrolledCourses} horizontal />
          </Animated.View>
        )}

        {/* Recent Courses */}
        {recentCourses.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <SectionHeader
              title="Recent Courses"
              showSeeAll
              onPressSeeAll={() => {}}
            />
            <CoursesList courses={recentCourses} horizontal />
          </Animated.View>
        )}

        {/* Most Comprehensive Courses */}
        {comprehensiveCourses.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <SectionHeader
              title="Most Comprehensive"
              showSeeAll
              onPressSeeAll={() => {}}
            />
            <CoursesList courses={comprehensiveCourses} horizontal />
          </Animated.View>
        )}

        {/* All Courses */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <SectionHeader title="All Courses" />
          {filteredCourses.length > 0 ? (
            <CoursesList courses={filteredCourses} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No courses found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedCategory !== 'All'
                  ? 'Try adjusting your search or category filter'
                  : 'No courses available at the moment'}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
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
      padding: 24,
    },
    scrollContent: {
      paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 16 : 48,
      paddingBottom: 16,
    },
    greeting: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    headerTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 28,
      color: colors.textPrimary,
    },
    loadingText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
    },
    errorText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.error,
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.background,
    },
    emptyState: {
      padding: 32,
      alignItems: 'center',
    },
    emptyTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });