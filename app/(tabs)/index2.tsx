import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  TouchableOpacity // ✅ Add this import
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import SearchBar from '@/components/SearchBar';
import CategoryScroll from '@/components/CategoryScroll';
import SectionHeader from '@/components/SectionHeader';
import CoursesList from '@/components/CoursesList';
import { Course } from '@/models/course';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '@/app/utils/supabase'; // ✅ Import supabase

// ✅ Categories berdasarkan grade_level dari database
const categories = ['All', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch courses dari Supabase database
  const fetchCoursesFromDatabase = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching courses from Supabase...');

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false }); // Order by newest first

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched courses:', data?.length || 0);
      setCourses(data || []);

    } catch (err: any) {
      console.error('Error fetching courses:', err);
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesFromDatabase();
  }, []);

  // ✅ Filter courses berdasarkan grade_level yang ada di database
  const filteredCourses = courses.filter((course: Course) => {
    const matchCategory = selectedCategory === 'All' || selectedCategory === `Grade ${course.grade_level}`;
    const matchSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchCategory && matchSearch;
  });

  // ✅ Buat sections berdasarkan data yang ada
  const recentCourses = [...filteredCourses]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);

  const comprehensiveCourses = [...filteredCourses]
    .sort((a, b) => b.total_lessons - a.total_lessons)
    .slice(0, 4);

  const clearSearch = () => {
    setSearchQuery('');
  };

  // ✅ Loading state
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

  // ✅ Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchCoursesFromDatabase}
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
          <SectionHeader 
            title="All Courses"/>
          
          {filteredCourses.length > 0 ? (
            <CoursesList courses={filteredCourses} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No courses found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedCategory !== 'All' 
                  ? 'Try adjusting your search or category filter'
                  : 'No courses available at the moment'
                }
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