import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { FileText, Clock } from 'lucide-react-native';
import { router } from 'expo-router';
import { Lesson } from '@/models/lesson';
import { useTheme } from '../app/context/ThemeContext';

interface LessonListItemProps {
  lesson: Lesson;
}

export default function LessonListItem({ lesson }: LessonListItemProps) {
  const navigateToLesson = () => {
    router.push(`/lesson/${lesson.id}`);
  };

  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={navigateToLesson}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <FileText size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{lesson.title}</Text>
        <View style={styles.lessonDetails}>
          <View style={styles.durationContainer}>
            <Clock size={14} color={colors.textSecondary} />
            {/* Jika tidak ada duration, tampilkan placeholder atau kosong */}
            <Text style={styles.duration}>-</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (colors: typeof import('@/constants/Colors').default.light) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.background,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    content: {
      flex: 1,
    },
    title: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    lessonDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    durationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    duration: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 4,
    },
  });