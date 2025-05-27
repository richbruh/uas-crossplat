import React from 'react';
import { StyleSheet, View, ScrollView, FlatList } from 'react-native';
import { Course } from '@/models/course';
import CourseCard from './CourseCard';

interface CoursesListProps {
  courses: Course[];
  horizontal?: boolean;
  variant?: 'horizontal' | 'vertical';
}

export default function CoursesList({ 
  courses, 
  horizontal = true, 
  variant = 'vertical' 
}: CoursesListProps) {
  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContainer}
      >
        {courses.map((course) => (
          <View key={course.id} style={styles.cardContainer}>
            <CourseCard course={course} variant={variant} />
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={courses}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <CourseCard course={item} variant="horizontal" />}
      contentContainerStyle={styles.verticalContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  horizontalContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  verticalContainer: {
    padding: 16,
  },
  cardContainer: {
    marginRight: 16,
  },
});