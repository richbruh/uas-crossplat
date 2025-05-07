//tabs/explore.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import SearchBar from '@/components/SearchBar';
import CategoryScroll from '@/components/CategoryScroll';
import CoursesList from '@/components/CoursesList';
import { mockCourses } from '@/data/courses';
import Colors from '@/constants/Colors';

const categories = ['All', 'Programming', 'Design', 'Business', 'Marketing', 'Data Science', 'Personal Development'];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const filteredCourses = mockCourses.filter(course => {
    const matchesSearch = searchQuery === '' || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore Courses</Text>
      </View>
      
      <SearchBar 
        value={searchQuery} 
        onChangeText={setSearchQuery} 
        onClear={clearSearch}
        placeholder="Search by title, description, or tags..."
      />
      
      <CategoryScroll 
        categories={categories} 
        selectedCategory={selectedCategory} 
        onSelectCategory={setSelectedCategory} 
      />

      <Animated.View entering={FadeIn.duration(500)} style={styles.content}>
        <Text style={styles.resultsText}>
          {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} found
        </Text>
        <CoursesList courses={filteredCourses} horizontal={false} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 48,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  resultsText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.textSecondary,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
});