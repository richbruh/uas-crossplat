import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Modal,
  Pressable,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Settings, Award, Book, BookOpen } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import SectionHeader from '@/components/SectionHeader';
import { useTheme } from '../context/ThemeContext';

const themeOptions = [
  { value: 'light', label: 'Light Theme' },
  { value: 'dark', label: 'Dark Theme' },
];

const user = {
  name: 'Alex Johnson',
  email: 'alex@example.com',
  avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
  completedCourses: 3,
  enrolledCourses: 5,
  totalHoursLearned: 28,
  achievements: [
    {
      id: '1',
      title: 'First Course Completed',
      description: 'Completed your first course',
      icon: '🏆',
      dateEarned: '2023-05-15',
    },
    {
      id: '2',
      title: 'Learning Streak',
      description: 'Learned for 7 consecutive days',
      icon: '🔥',
      dateEarned: '2023-06-02',
    },
    {
      id: '3',
      title: 'Quiz Master',
      description: 'Scored 100% on 5 quizzes',
      icon: '🎯',
      dateEarned: '2023-06-20',
    },
  ],
};

export default function ProfileScreen() {
  const { theme, setTheme, colors } = useTheme();
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const styles = getStyles(colors); // Pass colors directly to getStyles

  return (
    <>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setSettingsModalVisible(true)}
            >
              <Settings size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileContainer}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        <Animated.View entering={FadeIn.delay(100).duration(500)}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Book size={24} color={colors.primary} />
              <Text style={styles.statValue}>{user.enrolledCourses}</Text>
              <Text style={styles.statLabel}>Enrolled</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <BookOpen size={24} color={colors.success} />
              <Text style={styles.statValue}>{user.completedCourses}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Award size={24} color={colors.warning} />
              <Text style={styles.statValue}>{user.totalHoursLearned}</Text>
              <Text style={styles.statLabel}>Hours</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(200).duration(500)}>
          <SectionHeader title="Achievements" />
          <View style={styles.achievementsContainer}>
            {user.achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementItem}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <View style={styles.achievementContent}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(300).duration(500)}>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={isSettingsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Theme Settings</Text>
            {themeOptions.map((option: { value: string; label: string }) => (
              <TouchableOpacity
                key={option.value}
                style={styles.radioOption}
                onPress={() => setTheme(option.value as 'light' | 'dark')}
              >
                <View
                  style={[
                    styles.radioCircle,
                    theme === option.value && styles.radioSelected,
                  ]}
                />
                <Text style={styles.radioLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Update getStyles to accept colors directly instead of theme
const getStyles = (colors: any) => StyleSheet.create({
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: colors.textPrimary,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  userName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.borderLight,
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  achievementsContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  achievementDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionsContainer: {
    paddingHorizontal: 16,
  },
  actionButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error,
  },
  secondaryButtonText: {
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    marginRight: 12,
  },
  radioSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radioLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textPrimary,
  },
  modalCloseButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
  },
  modalCloseText: {
    color: colors.primary,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
});
