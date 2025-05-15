// tabs/explore.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import SearchBar from '@/components/SearchBar';
import CoursesList from '@/components/CoursesList';
import { mockCourses } from '@/data/courses';
import { useTheme } from '../context/ThemeContext';

const categories = [
  'All',
  'Programming',
  'Design',
  'Business',
  'Marketing',
  'Data Science',
  'Personal Development',
];

export default function ExploreScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredCourses = mockCourses.filter(course => {
    const matchesSearch =
      searchQuery === '' ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.tags.some(tag =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === 'All' || course.category === selectedCategory;

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

      {/* Inline & restyled CategoryScroll */}
      <CategoryScroll
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <Animated.View entering={FadeIn.duration(500)} style={styles.content}>
        <Text style={styles.resultsText}>
          {filteredCourses.length}{' '}
          {filteredCourses.length === 1 ? 'course' : 'courses'} found
        </Text>
        <CoursesList courses={filteredCourses} horizontal={false} />
      </Animated.View>
    </SafeAreaView>
  );
}

function CategoryScroll({
  categories,
  selectedCategory,
  onSelectCategory,
}: {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}) {
  const { colors } = useTheme();
  const styles = categoryStyles(colors);

  return (
    <View style={styles.container}>
      {categories.map(category => {
        const isSelected = category === selectedCategory;
        return (
          <TouchableOpacity
            key={category}
            onPress={() => onSelectCategory(category)}
            style={[
              styles.button,
              { backgroundColor: isSelected ? colors.primary : colors.card },
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: isSelected ? colors.textPrimary : colors.textPrimary },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const getStyles = (colors: typeof import('@/constants/Colors').default.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.textPrimary,
    },
    resultsText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
    },
  });

const categoryStyles = (colors: typeof import('@/constants/Colors').default.light) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      marginTop: 12,
      // horizontal spacing
      columnGap: 12,
      // vertical spacing between rows
      rowGap: 12,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
    },
    text: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
    },
  });
