import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Modal,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Settings, Award, Book, BookOpen } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { supabase } from '../utils/supabase';
import { useAuth } from '@/hooks/useAuth';
import SectionHeader from '@/components/SectionHeader';
import { useTheme } from '../context/ThemeContext';
import { profile } from '@/models/profile';
import { useRouter } from 'expo-router';

const themeOptions = [
  { value: 'light', label: 'Light Theme' },
  { value: 'dark', label: 'Dark Theme' },
];

// Dummy achievements jika belum ada tabel di database
const achievements = [
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
];

export default function ProfileScreen() {
  const { theme, setTheme, colors } = useTheme();
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  const styles = getStyles(colors);
  const [profile, setProfile] = useState<profile | null>(null);
  const [userStats, setUserStats] = useState({
    completedCourses: 0,
    enrolledCourses: 0,
    totalHoursLearned: 0
  });
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(null); 
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  function getRoleBadgeColor(role: string) {
    switch(role.toLowerCase()) {
      case 'admin': return colors.error;
      case 'instructor': return colors.warning;
      default: return colors.success;
    }
  }

  useEffect(() => {
    async function fetchProfileData() {
      try {
        // Cek user telah Login
        if(!session?.user) {
          setError('auth_error');
          setLoading(false);
          return;
        }

        // Fetch profile data
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role, created_at')
          .eq('user_id', session.user.id)
          .single();

        if (error) throw error;

        // Mapping kolom dari tabel ke state
        setProfile({
          user_id: data.user_id,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          role: data.role,
          created_at: data.created_at
        });

        // Fetch statistik (contoh data - gantilah dengan query ke database jika ada)
        // Contoh: Fetch dari tabel enrollments
        // const { data: enrollments, error: enrollmentsError } = await supabase
        //   .from('enrollments')
        //   .select('*')
        //   .eq('user_id', session.user.id);
        
        // if (enrollmentsError) throw enrollmentsError;
        
        // Set data statistik dengan nilai dummy (ganti dengan data nyata jika ada)
        setUserStats({
          completedCourses: 3,
          enrolledCourses: 5,
          totalHoursLearned: 28
        });
      }
      catch(err){
        console.error('Error fetching profile:', err);
        if (!session?.user) {
          setError('auth_error');
        } else {
          setError('Failed to fetch profile data');
        }
      }
      finally {
        setLoading(false);
      }
    }
    
    fetchProfileData();
  }, [session]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Error signing out:', err);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>
          Loading profile...
        </Text>
      </View>
    );
  }

  // Authentication error
  if (error === 'auth_error') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ 
          fontFamily: 'Inter-SemiBold',
          fontSize: 18,
          color: colors.textPrimary,
          marginBottom: 16,
          textAlign: 'center'
        }}>
          Anda belum terauthentikasi silakan login
        </Text>
        <TouchableOpacity 
          style={[styles.actionButton, { width: 200 }]}
          onPress={() => router.push('/(auth)/Login')}
        >
          <Text style={styles.actionButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Other error states
  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ color: colors.error, marginBottom: 16, textAlign: 'center' }}>
          {error}
        </Text>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => {
            setLoading(true);
            setError(null);
          }}
        >
          <Text style={styles.actionButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 40, color: colors.textPrimary }}>
                  {profile?.full_name?.charAt(0) || '?'}
                </Text>
              </View>
            )}
            <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
            <Text style={styles.userEmail}>{session?.user?.email}</Text>
            {profile?.role && (
              <View style={{ marginTop: 8, paddingVertical: 4, paddingHorizontal: 12, backgroundColor: getRoleBadgeColor(profile.role), borderRadius: 12 }}>
                <Text style={{ color: 'white', fontFamily: 'Inter-Medium' }}>{profile.role}</Text>
              </View>
            )}
          </View>

          <Animated.View entering={FadeIn.delay(100).duration(500)}>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Book size={24} color={colors.primary} />
                <Text style={styles.statValue}>{userStats.enrolledCourses}</Text>
                <Text style={styles.statLabel}>Enrolled</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <BookOpen size={24} color={colors.success} />
                <Text style={styles.statValue}>{userStats.completedCourses}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Award size={24} color={colors.warning} />
                <Text style={styles.statValue}>{userStats.totalHoursLearned}</Text>
                <Text style={styles.statLabel}>Hours</Text>
              </View>
            </View>
          </Animated.View>

          {/* Achievement section - uncomment jika diperlukan */}
          {/*<Animated.View entering={FadeIn.delay(200).duration(500)}>
            <SectionHeader title="Achievements" />
            <View style={styles.achievementsContainer}>
              {achievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementItem}>
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <View style={styles.achievementContent}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>*/}

          <Animated.View entering={FadeIn.delay(300).duration(500)}>
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={handleSignOut}
              >
                <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                  Sign Out
                </Text>
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