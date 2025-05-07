import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Play, FileText, CircleCheck as CheckCircle2, Clock } from 'lucide-react-native';
import { router } from 'expo-router';
import { Lesson } from '@/types';
import Colors from '@/constants/Colors';

interface LessonListItemProps {
  lesson: Lesson;
}

export default function LessonListItem({ lesson }: LessonListItemProps) {
  const navigateToLesson = () => {
    router.push(`/lesson/${lesson.id}`);
  };

  const getLessonIcon = () => {
    switch (lesson.type) {
      case 'video':
        return <Play size={18} color={Colors.textSecondary} />;
      case 'reading':
        return <FileText size={18} color={Colors.textSecondary} />;
      case 'quiz':
        return <CheckCircle2 size={18} color={Colors.textSecondary} />;
      default:
        return <Play size={18} color={Colors.textSecondary} />;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={navigateToLesson}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>{getLessonIcon()}</View>
      <View style={styles.content}>
        <Text style={styles.title}>{lesson.title}</Text>
        <View style={styles.lessonDetails}>
          <View style={styles.durationContainer}>
            <Clock size={14} color={Colors.textSecondary} />
            <Text style={styles.duration}>{lesson.duration}</Text>
          </View>
          <Text style={[
            styles.status,
            lesson.completed ? styles.completedStatus : styles.pendingStatus
          ]}>
            {lesson.completed ? 'Completed' : 'Not Started'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
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
    color: Colors.textPrimary,
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
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  status: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  completedStatus: {
    color: Colors.success,
  },
  pendingStatus: {
    color: Colors.textSecondary,
  },
});