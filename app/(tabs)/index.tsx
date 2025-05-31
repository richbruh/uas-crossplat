import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import SearchBar from '@/components/SearchBar';
import CategoryScroll from '@/components/CategoryScroll';
import SectionHeader from '@/components/SectionHeader';
import CoursesList from '@/components/CoursesList';
import { fetchCourses } from '@/data/courses';
import { useTheme } from '../context/ThemeContext';
import { Course } from '@/models';

const categories = ['All', 'Programming', 'Design', 'Business', 'Marketing', 'Data Science', 'Personal Development'];

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter courses by search and category
  const filteredCourses = courses.filter((course: any) => {
    const matchCategory = selectedCategory === 'All' || course.category === selectedCategory;
    const matchSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const enrolledCourses = filteredCourses.filter((c: any) => c.enrolled);
  const popularCourses = [...filteredCourses].sort((a: any, b: any) => b.rating - a.rating).slice(0, 4);
  const recommendedCourses = filteredCourses.slice(2, 6);

  const clearSearch = () => {
    setSearchQuery('');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
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
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.headerTitle}>Continue Learning</Text>
        </View>
        
        <SearchBar 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
          onClear={clearSearch}
        />
        
        <CategoryScroll 
          categories={categories} 
          selectedCategory={selectedCategory} 
          onSelectCategory={setSelectedCategory} 
        />

        {enrolledCourses.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <SectionHeader 
              title="My Courses" 
              showSeeAll 
              onPressSeeAll={() => {}} 
            />
            <CoursesList courses={enrolledCourses} horizontal />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <SectionHeader 
            title="Popular Courses" 
            showSeeAll 
            onPressSeeAll={() => {}} 
          />
          <CoursesList courses={popularCourses} horizontal />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <SectionHeader 
            title="Recommended For You" 
            showSeeAll 
            onPressSeeAll={() => {}} 
          />
          <CoursesList courses={recommendedCourses} horizontal />
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
  });