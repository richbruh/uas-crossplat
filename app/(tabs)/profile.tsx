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
import { profile as ProfileType, getRoleBadgeColor } from '@/models/profile';
import { useRouter } from 'expo-router';

// -----------------------------
// Constants
// -----------------------------
const THEME_OPTIONS = [
  { value: 'light', label: 'Light Theme' },
  { value: 'dark', label: 'Dark Theme' },
];

const ERROR_TYPES = {
  AUTH: 'auth_error',
  DATA: 'data_error',
};

const DEFAULT_USER_STATS = {
  completedCourses: 0,
  enrolledCourses: 0,
};

interface UserStats {
  completedCourses: number;
  enrolledCourses: number;
}

// -----------------------------
// Helper Components
// -----------------------------

interface LoadingViewProps {
  colors: any;
}

const LoadingView = ({ colors }: LoadingViewProps) => (
  <View style={[styles(colors).container, { justifyContent: 'center', alignItems: 'center' }]}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={{ marginTop: 16, color: colors.textSecondary }}>
      Loading profile...
    </Text>
  </View>
);

interface AuthErrorViewProps {
  colors: any;
  onLogin: () => void;
}

const AuthErrorView = ({ colors, onLogin }: AuthErrorViewProps) => (
  <View style={[styles(colors).container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
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
      style={[styles(colors).actionButton, { width: 200 }]}
      onPress={onLogin}
    >
      <Text style={styles(colors).actionButtonText}>Login</Text>
    </TouchableOpacity>
  </View>
);

interface ErrorViewProps {
  colors: any;
  error: string;
  onRetry: () => void;
}

const ErrorView = ({ colors, error, onRetry }: ErrorViewProps) => (
  <View style={[styles(colors).container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
    <Text style={{ color: colors.error, marginBottom: 16, textAlign: 'center' }}>
      {error}
    </Text>
    <TouchableOpacity 
      style={styles(colors).actionButton} 
      onPress={onRetry}
    >
      <Text style={styles(colors).actionButtonText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);

interface UserProfileProps {
  profile: ProfileType | null;
  colors: any;
  email: string | undefined;
}

const UserProfile = ({ profile, colors, email }: UserProfileProps) => (
  <View style={styles(colors).profileContainer}>
    {profile?.avatar_url ? (
      <Image source={{ uri: profile.avatar_url }} style={styles(colors).avatar} />
    ) : (
      <View style={[styles(colors).avatar, { backgroundColor: colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 40, color: colors.textPrimary }}>
          {profile?.full_name?.charAt(0) || '?'}
        </Text>
      </View>
    )}
    <Text style={styles(colors).userName}>{profile?.full_name || 'User'}</Text>
    <Text style={styles(colors).userEmail}>{email}</Text>
    {profile?.role && (
      <View style={[styles(colors).roleBadge, { backgroundColor: getRoleBadgeColor(profile.role) }]}>
        <Text style={styles(colors).roleBadgeText}>{profile.role}</Text>
      </View>
    )}
  </View>
);

interface StatsDisplayProps {
  stats: UserStats;
  colors: any;
}

const StatsDisplay = ({ stats, colors }: StatsDisplayProps) => (
  <Animated.View entering={FadeIn.delay(100).duration(500)}>
    <View style={styles(colors).statsContainer}>
      <View style={styles(colors).statItem}>
        <Book size={24} color={colors.primary} />
        <Text style={styles(colors).statValue}>{stats.enrolledCourses}</Text>
        <Text style={styles(colors).statLabel}>Enrolled</Text>
      </View>
      <View style={styles(colors).statDivider} />
      <View style={styles(colors).statItem}>
        <BookOpen size={24} color={colors.success} />
        <Text style={styles(colors).statValue}>{stats.completedCourses}</Text>
        <Text style={styles(colors).statLabel}>Completed</Text>
      </View>
    </View>
  </Animated.View>
);

interface ActionButtonsProps {
  colors: any;
  onSignOut: () => void;
}

const ActionButtons = ({ colors, onSignOut }: ActionButtonsProps) => (
  <Animated.View entering={FadeIn.delay(300).duration(500)}>
    <View style={styles(colors).actionsContainer}>
      <TouchableOpacity style={styles(colors).actionButton}>
        <Text style={styles(colors).actionButtonText}>Edit Profile</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles(colors).actionButton, styles(colors).secondaryButton]}
        onPress={onSignOut}
      >
        <Text style={[styles(colors).actionButtonText, styles(colors).secondaryButtonText]}>
          Sign Out
        </Text>
      </TouchableOpacity>
    </View>
  </Animated.View>
);

interface ThemeSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  currentTheme: string;
  onThemeChange: (theme: 'light' | 'dark') => void;
  colors: any;
}

const ThemeSettingsModal = ({ 
  visible, 
  onClose, 
  currentTheme, 
  onThemeChange, 
  colors 
}: ThemeSettingsModalProps) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent
    onRequestClose={onClose}
  >
    <View style={styles(colors).modalOverlay}>
      <View style={styles(colors).modalContainer}>
        <Text style={styles(colors).modalTitle}>Theme Settings</Text>
        {THEME_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles(colors).radioOption}
            onPress={() => onThemeChange(option.value as 'light' | 'dark')}
          >
            <View
              style={[
                styles(colors).radioCircle,
                currentTheme === option.value && styles(colors).radioSelected,
              ]}
            />
            <Text style={styles(colors).radioLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles(colors).modalCloseButton}
          onPress={onClose}
        >
          <Text style={styles(colors).modalCloseText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// -----------------------------
// Main Component
// -----------------------------

export default function ProfileScreen() {
  // Theme and UI state
  const { theme, setTheme, colors } = useTheme();
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);
  
  // User data state
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [userStats, setUserStats] = useState<UserStats>(DEFAULT_USER_STATS);
  const { session } = useAuth();
  
  // App state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch profile data from Supabase
  useEffect(() => {
    fetchProfileData();
  }, [session]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is logged in
      if(!session?.user) {
        setError(ERROR_TYPES.AUTH);
        return;
      }

      // Fetch profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, created_at')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      // Set profile data
      setProfile({
        user_id: data.user_id,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        role: data.role,
        created_at: data.created_at
      });

    // Fetch enrollment data with course information for stats
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        id, 
        progress_percentage
      `)
      .eq('student_id', session.user.id);

    if (enrollmentError) throw enrollmentError;

    // Calculate real stats from enrollment data
    const enrolledCourses = enrollmentData.length;
    const completedCourses = enrollmentData.filter(item => item.progress_percentage >= 100).length;
    
    // Set real user stats
    setUserStats({
      completedCourses,
      enrolledCourses
    });
  }
  catch(err: any) {
    console.error('Error fetching profile:', err);
    
    if (!session?.user) {
      setError(ERROR_TYPES.AUTH);
    } else {
      setError(err.message || 'Failed to fetch profile data');
    }
  }
  finally {
    setLoading(false);
  }
};

  // Handle user sign out
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/(auth)/Login');
    } catch (err: any) {
      console.error('Error signing out:', err);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // Handle retry on error
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchProfileData();
  };

  // Navigate to login screen
  const navigateToLogin = () => {
    router.push('/(auth)/Login');
  };

  // Conditional rendering based on state
  if (loading) {
    return <LoadingView colors={colors} />;
  }

  if (error === ERROR_TYPES.AUTH) {
    return <AuthErrorView colors={colors} onLogin={navigateToLogin} />;
  }

  if (error) {
    return <ErrorView colors={colors} error={error} onRetry={handleRetry} />;
  }

  // Main profile view
  return (
    <>
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).header}>
          <View style={styles(colors).headerContent}>
            <Text style={styles(colors).headerTitle}>Profile</Text>
            <TouchableOpacity
              style={styles(colors).settingsButton}
              onPress={() => setSettingsModalVisible(true)}
            >
              <Settings size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles(colors).scrollContent}
        >
          {/* User Profile Information */}
          <UserProfile 
            profile={profile} 
            colors={colors} 
            email={session?.user?.email}
          />
          
          {/* User Stats */}
          <StatsDisplay stats={userStats} colors={colors} />
          
          {/* Action Buttons */}
          <ActionButtons colors={colors} onSignOut={handleSignOut} />
        </ScrollView>
      </SafeAreaView>

      {/* Theme Settings Modal */}
      <ThemeSettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        currentTheme={theme}
        onThemeChange={setTheme}
        colors={colors}
      />
    </>
  );
}

// -----------------------------
// Styles
// -----------------------------

const styles = (colors: any) => StyleSheet.create({
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
  roleBadge: {
    marginTop: 8, 
    paddingVertical: 10,  
    paddingHorizontal: 16,
    borderRadius: 20
  },
  roleBadgeText: {
    color: 'white', 
    fontFamily: 'Inter-Medium'
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