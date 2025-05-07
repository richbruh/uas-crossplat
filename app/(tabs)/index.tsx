//(tabs)/index.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import SearchBar from '@/components/SearchBar';
import CategoryScroll from '@/components/CategoryScroll';
import SectionHeader from '@/components/SectionHeader';
import CoursesList from '@/components/CoursesList';
import { getPopularCourses, getEnrolledCourses, getRecommendedCourses } from '@/data/courses';
import Colors from '@/constants/Colors';

const categories = ['All', 'Programming', 'Design', 'Business', 'Marketing', 'Data Science', 'Personal Development'];

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const enrolledCourses = getEnrolledCourses();
  const popularCourses = getPopularCourses();
  const recommendedCourses = getRecommendedCourses();

  const clearSearch = () => {
    setSearchQuery('');
  };

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: Colors.textPrimary,
  },
});