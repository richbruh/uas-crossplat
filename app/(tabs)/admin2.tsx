//bedanya admin2.tsx styling berbeda trus masih belum bisa terkhususkan untuk role admin
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Platform,
  Image,
  FlatList,
  Modal,
  Pressable
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../utils/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { getRoleBadgeColor } from '@/models/profile';
import { User, UserCheck, Shield, UserX, ChevronRight, MoreVertical, X } from 'lucide-react-native';

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'student' | 'teacher' | 'admin';
  created_at: string;
  email?: string;
}

export default function AdminPage() {
  const { colors } = useTheme();
  const { session, user } = useAuth();
  const router = useRouter();
  const styles = getStyles(colors);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
    if (!user || user.role !== 'admin') {
      setError('Access Denied: Admin privileges required');
      setLoading(false);
    } else {
      fetchProfiles();
    }
  }, [user]);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, avatar_url, created_at')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setProfiles(data || []);
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      setError(err.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfiles();
  };

  const openRoleEditor = (profile: Profile) => {
    setSelectedProfile(profile);
    setModalVisible(true);
  };

  const closeRoleEditor = () => {
    setModalVisible(false);
    setSelectedProfile(null);
  };

  const updateUserRole = async (newRole: 'student' | 'teacher' | 'admin') => {
    if (!selectedProfile) return;

    try {
      setLoading(true);
      
      // Don't allow demoting yourself from admin
      if (selectedProfile.user_id === user?.id && newRole !== 'admin') {
        Alert.alert('Error', 'You cannot remove admin privileges from yourself');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', selectedProfile.user_id);

      if (error) throw error;

      // Update local state
      setProfiles(prev => prev.map(profile => 
        profile.user_id === selectedProfile.user_id ? { ...profile, role: newRole } : profile
      ));

      Alert.alert('Success', `User role updated to ${newRole}`);
      closeRoleEditor();
    } catch (err: any) {
      console.error('Error updating role:', err);
      Alert.alert('Error', err.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const confirmRoleChange = (newRole: 'student' | 'teacher' | 'admin') => {
    if (!selectedProfile) return;
    
    Alert.alert(
      'Confirm Role Change',
      `Are you sure you want to change ${selectedProfile.full_name || 'this user'}'s role from ${selectedProfile.role} to ${newRole}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => updateUserRole(newRole),
        },
      ]
    );
  };

  const renderProfileItem = ({ item }: { item: Profile }) => (
    <View style={styles.profileCard}>
      <View style={styles.profileInfo}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.card }]}>
            <User size={24} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.profileText}>
          <Text style={styles.profileName} numberOfLines={1}>
            {item.full_name || 'Unknown User'}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {item.user_id}
          </Text>
        </View>
      </View>
      
      <View style={styles.roleContainer}>
        <View style={[
          styles.roleBadge,
          { backgroundColor: getRoleBadgeColor(item.role, colors) },
        ]}>
          {item.role === 'admin' && <Shield size={16} color={colors.background} />}
          {item.role === 'teacher' && <UserCheck size={16} color={colors.background} />}
          {item.role === 'student' && <User size={16} color={colors.background} />}
          <Text style={styles.roleText}>
            {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
          </Text>
        </View>
        
        {user?.role === 'admin' && (
          <TouchableOpacity 
            onPress={() => openRoleEditor(item)}
            style={styles.moreButton}
          >
            <MoreVertical size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <UserX size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          {error.includes('Access Denied') ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ChevronRight size={20} color={colors.background} />
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchProfiles}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>
          {profiles.length} registered users
        </Text>
      </View>

      <FlatList
        data={profiles}
        renderItem={renderProfileItem}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <User size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {/* Role Editor Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeRoleEditor}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change User Role</Text>
              <TouchableOpacity onPress={closeRoleEditor}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              {selectedProfile?.full_name || 'Unknown User'}
            </Text>
            <Text style={styles.modalEmail}>
              {selectedProfile?.user_id}
            </Text>
            
            <View style={styles.currentRoleContainer}>
              <Text style={styles.currentRoleLabel}>Current Role:</Text>
              <View style={[
                styles.currentRoleBadge,
                { backgroundColor: getRoleBadgeColor(selectedProfile?.role || 'student', colors) }
              ]}>
                <Text style={styles.currentRoleText}>
                  {selectedProfile?.role ? selectedProfile.role.charAt(0).toUpperCase() + selectedProfile.role.slice(1) : 'Unknown'}
                </Text>
              </View>
            </View>
            
            <View style={styles.roleOptionsContainer}>
              <Text style={styles.roleOptionsTitle}>Select New Role:</Text>
              
              <TouchableOpacity 
                style={[
                  styles.roleOption,
                  styles.adminOption,
                  selectedProfile?.role === 'admin' && styles.roleOptionDisabled
                ]}
                onPress={() => confirmRoleChange('admin')}
                disabled={selectedProfile?.role === 'admin' || loading}
              >
                <Shield size={20} color={colors.background} />
                <Text style={styles.roleOptionText}>Admin</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.roleOption,
                  styles.teacherOption,
                  selectedProfile?.role === 'teacher' && styles.roleOptionDisabled
                ]}
                onPress={() => confirmRoleChange('teacher')}
                disabled={selectedProfile?.role === 'teacher' || loading}
              >
                <UserCheck size={20} color={colors.background} />
                <Text style={styles.roleOptionText}>Teacher</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.roleOption,
                  styles.studentOption,
                  selectedProfile?.role === 'student' && styles.roleOptionDisabled
                ]}
                onPress={() => confirmRoleChange('student')}
                disabled={selectedProfile?.role === 'student' || loading}
              >
                <User size={20} color={colors.background} />
                <Text style={styles.roleOptionText}>Student</Text>
              </TouchableOpacity>
            </View>
            
            {loading && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.modalLoading} />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorText: {
      marginTop: 16,
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: colors.error,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 24,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: colors.background,
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
    },
    backButton: {
      marginTop: 24,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButtonText: {
      color: colors.background,
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      marginLeft: 8,
    },
    listContent: {
      padding: 16,
    },
    profileCard: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    profileInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    profileText: {
      flex: 1,
    },
    profileName: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 2,
    },
    profileEmail: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.textSecondary,
    },
    roleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    roleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    roleText: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      color: colors.background,
      marginLeft: 4,
    },
    moreButton: {
      marginLeft: 12,
      padding: 4,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 48,
    },
    emptyText: {
      marginTop: 16,
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.textSecondary,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContainer: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: colors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    modalEmail: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 16,
    },
    currentRoleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    currentRoleLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginRight: 8,
    },
    currentRoleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    currentRoleText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.background,
    },
    roleOptionsContainer: {
      marginTop: 8,
    },
    roleOptionsTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    roleOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    roleOptionDisabled: {
      opacity: 0.6,
    },
    adminOption: {
      backgroundColor: colors.error,
    },
    teacherOption: {
      backgroundColor: colors.warning,
    },
    studentOption: {
      backgroundColor: colors.success,
    },
    roleOptionText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.background,
      marginLeft: 12,
    },
    modalLoading: {
      marginTop: 16,
    },
  });
