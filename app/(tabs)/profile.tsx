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
import { Settings, Award, Book, BookOpen, ChevronRight, Camera, ImageIcon } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { supabase } from '../utils/supabase';
import { useAuth } from '@/hooks/useAuth';
import SectionHeader from '@/components/SectionHeader';
import { useTheme } from '../context/ThemeContext';
import { profile as ProfileType, getRoleBadgeColor } from '@/models/profile';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import EditProfileForm from '@/components/EditProfileForm';

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

interface TeacherSectionProps {
  profile: ProfileType | null;
  colors: any;
  onNavigateToTeacher: () => void;
  onNavigateToAdmin: () => void;
}


// Replace the existing TeacherSection component
const TeacherSection = ({ profile, colors, onNavigateToTeacher }: TeacherSectionProps) => {
  // Show for both teacher and admin roles
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') return null;

  return (
    <Animated.View entering={FadeIn.delay(200).duration(500)}>
      <View style={styles(colors).teacherSection}>
        <Text style={styles(colors).sectionTitle}>
          {profile?.role === 'admin' ? 'Management Tools' : 'Teacher Tools'}
        </Text>
        
        {/* Teacher Dashboard Access */}
        <TouchableOpacity 
          style={styles(colors).teacherButton}
          onPress={onNavigateToTeacher}
        >
          <View style={styles(colors).teacherButtonContent}>
            <View style={styles(colors).teacherIcon}>
              <Settings size={20} color={colors.primary} />
            </View>
            <View style={styles(colors).teacherTextContainer}>
              <Text style={styles(colors).teacherButtonText}>Course Dashboard</Text>
              <Text style={styles(colors).teacherButtonSubtext}>
                {profile?.role === 'admin' 
                  ? 'Manage all courses and content' 
                  : 'Manage your courses and lessons'
                }
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Admin-Only Navigation */}
        {profile?.role === 'admin' && (
          <TouchableOpacity 
            style={[styles(colors).teacherButton, { marginTop: 12 }]}
            onPress={() => {/* Add admin navigation */}}
          >
            <View style={styles(colors).teacherButtonContent}>
              <View style={[styles(colors).teacherIcon, { backgroundColor: colors.error + '20' }]}>
                <Award size={20} color={colors.error} />
              </View>
              <View style={styles(colors).teacherTextContainer}>
                <Text style={styles(colors).teacherButtonText}>Admin Dashboard</Text>
                <Text style={styles(colors).teacherButtonSubtext}>
                  Manage users, system settings & analytics
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

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
  onChangePhoto: () => void;
  uploadingPhoto: boolean;
}

const UserProfile = ({ profile, colors, email, onChangePhoto, uploadingPhoto }: UserProfileProps) => (
  <View style={styles(colors).profileContainer}>
    <TouchableOpacity 
      onPress={onChangePhoto}
      style={styles(colors).avatarContainer}
      disabled={uploadingPhoto}
    >
      {profile?.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles(colors).avatar} />
      ) : (
        <View style={[styles(colors).avatar, styles(colors).defaultAvatar]}>
          <Text style={styles(colors).defaultAvatarText}>
            {profile?.full_name?.charAt(0) || '?'}
          </Text>
        </View>
      )}
      
      {/* Camera overlay icon */}
      <View style={styles(colors).cameraOverlay}>
        {uploadingPhoto ? (
          <ActivityIndicator size={16} color={colors.background} />
        ) : (
          <Camera size={16} color={colors.background} />
        )}
      </View>
    </TouchableOpacity>
    
    <Text style={styles(colors).userName}>{profile?.full_name || 'User'}</Text>
    <Text style={styles(colors).userEmail}>{email}</Text>
    <Text style={styles(colors).changePhotoHint}>
      {uploadingPhoto ? 'Uploading...' : 'Tap photo to change'}
    </Text>
    
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
  onEditProfile: () => void;
}

const ActionButtons = ({ colors, onSignOut, onEditProfile }: ActionButtonsProps) => (
  <Animated.View entering={FadeIn.delay(300).duration(500)}>
    <View style={styles(colors).actionsContainer}>
      <TouchableOpacity 
        style={styles(colors).actionButton}
        onPress={onEditProfile}
      >
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
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  
  // User data state
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [userStats, setUserStats] = useState<UserStats>(DEFAULT_USER_STATS);
  const { session } = useAuth();
  
  // App state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const router = useRouter();

  // Navigation functions
  const navigateToTeacherDashboard = () => {
    router.push('/teacher/dashboard');
  };

  const navigateToAdminDashboard = () => {
  router.push('/admin/admin'); // Based on your folder structure
};

  // Profile update handler
  const handleProfileUpdate = (updatedProfile: ProfileType) => {
    setProfile(updatedProfile);
    setEditModalVisible(false);
  };

  // Image picker and upload functions
  const requestImagePickerPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to change your profile picture.'
      );
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera permissions to take photos.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to select your profile picture',
      [
        {
          text: 'Camera',
          onPress: () => openImagePicker('camera'),
          style: 'default',
        },
        {
          text: 'Gallery',
          onPress: () => openImagePicker('library'),
          style: 'default',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  
  const openImagePicker = async (source: 'camera' | 'library') => {
    try {
      let result;
      
      if (source === 'camera') {
        const hasPermission = await requestCameraPermissions();
        if (!hasPermission) return;
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const hasPermission = await requestImagePickerPermissions();
        if (!hasPermission) return;
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setUploadingPhoto(true);

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Create file name
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to blob
      const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        try {
          const oldFileName = profile.avatar_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('avatars')
              .remove([oldFileName]);
          }
        } catch (deleteError) {
          console.warn('Could not delete old avatar:', deleteError);
        }
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', session.user.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
      
      Alert.alert('Success', 'Profile picture updated successfully!');

    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', error.message || 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

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
            onChangePhoto={pickImage}
            uploadingPhoto={uploadingPhoto}
          />
          
          {/* User Stats */}
          <StatsDisplay stats={userStats} colors={colors} />
          
          {/* Teacher Section */}
          <TeacherSection 
            profile={profile} 
            colors={colors} 
            onNavigateToTeacher={navigateToTeacherDashboard}
            onNavigateToAdmin={navigateToAdminDashboard}
          />
          {/* Action Buttons */}
          <ActionButtons 
            colors={colors} 
            onSignOut={handleSignOut}
            onEditProfile={() => setEditModalVisible(true)}
          />
        </ScrollView>
      </SafeAreaView>

      {/* Edit Profile Modal */}
      <EditProfileForm
        visible={isEditModalVisible}
        profile={profile}
        onClose={() => setEditModalVisible(false)}
        onSuccess={handleProfileUpdate}
        colors={colors}
      />

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
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  defaultAvatar: {
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    fontSize: 40,
    color: colors.textPrimary,
    fontFamily: 'Inter-SemiBold',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  changePhotoHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
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
  teacherSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  teacherButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  teacherButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teacherIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teacherTextContainer: {
    flex: 1,
  },
  teacherButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  teacherButtonSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  }
});