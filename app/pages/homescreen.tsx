import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  Platform, 
  ScrollView,
  TouchableOpacity,
  Image
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getEnrolledCourses, getRecommendedCourses, getPopularCourses } from '@/data/courses';
import { useTheme } from '../context/ThemeContext';
import SearchBar from '@/components/SearchBar';
import CategoryScroll from '@/components/CategoryScroll';
import SectionHeader from '@/components/SectionHeader';
import CoursesList from '@/components/CoursesList';

const categories = ['All', 'Programming', 'Design', 'Business', 'Marketing', 'Data Science', 'Personal Development'];

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Get courses data
  const enrolledCourses = getEnrolledCourses();
  const popularCourses = getPopularCourses();
  const recommendedCourses = getRecommendedCourses();

  // If user is not logged in, redirect to login page
  useEffect(() => {
    if (!session) {
      router.replace('/(auth)/Login');
    }
  }, [session]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {session.user?.email?.split('@')[0]}</Text>
          <Text style={styles.headerTitle}>Continue Learning</Text>
        </View>
        
        <SearchBar 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
          onClear={clearSearch}
          placeholder="Search for courses..."
        />
        
        <CategoryScroll 
          categories={categories} 
          selectedCategory={selectedCategory} 
          onSelectCategory={setSelectedCategory} 
        />

        {enrolledCourses.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <SectionHeader 
              title="My Enrolled Courses" 
              showSeeAll 
              onPressSeeAll={() => router.push('/(tabs)/my-learning')}
            />
            <CoursesList courses={enrolledCourses} horizontal={true} />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.emptyCoursesContainer}>
            <Text style={styles.emptyCoursesText}>You haven't enrolled in any courses yet</Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={styles.exploreButtonText}>Explore Courses</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <SectionHeader 
            title="Popular Courses" 
            showSeeAll 
            onPressSeeAll={() => router.push('/(tabs)/explore')}
          />
          <CoursesList courses={popularCourses} horizontal={true} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <SectionHeader 
            title="Recommended For You" 
            showSeeAll 
            onPressSeeAll={() => router.push('/(tabs)/explore')}
          />
          <CoursesList courses={recommendedCourses} horizontal={true} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
// Defined ThemeColors interface (Apa itu Interface ? Interface adalah cara untuk mendefinisikan tipe data di TypeScript. 
// Interface digunakan untuk mendefinisikan struktur objek, 
// termasuk properti dan tipe data yang dimiliki oleh objek tersebut. 
// Dalam konteks ini, interface ThemeColors 
// digunakan untuk mendefinisikan struktur 
// objek yang berisi warna-warna tema aplikasi.)
interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  textPrimary: string;
  textSecondary: string;
  primary: string;
}
// Colors perlu di infer type nya
const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 48,
    paddingBottom: 8,
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
    marginBottom: 16,
  },
  emptyCoursesContainer: {
    padding: 24,
    margin: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyCoursesText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  exploreButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.background,
  },
});