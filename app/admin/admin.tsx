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
  Platform
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../utils/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { getRoleBadgeColor } from '@/models/profile';

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'student' | 'teacher' | 'admin';
  created_at: string;
  email?: string;
}

const Admin = () => {
  const { colors } = useTheme();
  const { session } = useAuth(); // ✅ Fixed: Use session
  const router = useRouter();


  // State management
  const [state, setState] = useState({
    profiles: [] as Profile[],
    loading: true,
    error: null as string | null,
    searchQuery: '',
    selectedProfile: null as Profile | null,
    newRole: 'student' as 'student' | 'teacher' | 'admin',
    updatingRole: false,
    page: 1,
    hasMore: true,
    refreshing: false
  });

  console.log('[Admin] Current state:', state);

  // Verify admin status on mount
    useEffect(() => {
      console.log('[Admin] Checking admin privileges...');

      if (session?.user?.role !== 'admin') { // ✅ Fixed: Check role via session.user
        console.warn('[Admin] User role is not admin:', session?.user?.role);
      } else {
        console.log('[Admin] User has admin access');
      }
    }, [session]); // ✅ Fixed: Depend on session

  // Fetch data with error boundaries
  const fetchData = useCallback(async (page = 1, refresh = false) => {
    console.log(`[Admin] Fetching data. Page: ${page}, Refresh: ${refresh}`);
    try {
      setState(prev => ({ 
        ...prev, 
        loading: !refresh,
        refreshing: refresh,
        error: null 
      }));
      
      const from = (page - 1) * 10;
      const to = from + 9;
      
      console.log('[Admin] Querying profiles from Supabase...');
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          avatar_url,
          role,
          created_at,
          auth:users(email)
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('[Admin] Error fetching profiles:', error);
        throw error;
      }
      
      console.log(`[Admin] Retrieved ${data.length} profiles`);
      const formattedData = data.map(item => ({
        ...item,
        email: item.auth?.email
      }));

      setState(prev => ({
        ...prev,
        profiles: page === 1 ? formattedData : [...prev.profiles, ...formattedData],
        loading: false,
        refreshing: false,
        hasMore: formattedData.length >= 10,
        page
      }));
      console.log('[Admin] State updated with new profiles');
    } catch (err) {
      console.error('[Admin] Error in fetchData:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: err instanceof Error ? err.message : 'Failed to load data'
      }));
    }
  }, []);

  // Initial load
  useEffect(() => {
    console.log('[Admin] Running initial data fetch');
    fetchData();
  }, [fetchData]);

  // Filter profiles based on search
  const filteredProfiles = useMemo(() => {
    console.log('[Admin] Filtering profiles with query:', state.searchQuery);
    return state.profiles.filter(profile =>
      profile.full_name?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      profile.email?.toLowerCase().includes(state.searchQuery.toLowerCase())
    );
  }, [state.profiles, state.searchQuery]);

  // Update user role
  const updateUserRole = async () => {
    if (!state.selectedProfile || !session?.user) { // ✅ Fixed: Use session.user
      console.warn('[Admin] No selected profile or user for role update');
      return;
    }
    
    try {
      console.log('[Admin] Starting role update for user:', state.selectedProfile.user_id);
      console.log('[Admin] Changing role from', state.selectedProfile.role, 'to', state.newRole);
      
      setState(prev => ({ ...prev, updatingRole: true }));
      
      // Prevent self-demotion
      if (state.selectedProfile.user_id === session.user.id && state.newRole !== 'admin') { // ✅ Fixed: Use session.user.id
        const errorMsg = 'You cannot remove your own admin privileges';
        console.error('[Admin] Self-demotion attempt:', errorMsg);
        throw new Error(errorMsg);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: state.newRole })
        .eq('user_id', state.selectedProfile.user_id);

      if (error) {
        console.error('[Admin] Supabase role update error:', error);
        throw error;
      }

      console.log('[Admin] Role updated successfully, creating audit log...');
      // Log the admin action
      const { error: auditError } = await supabase.from('admin_audit_log').insert({
        admin_id: session.user.id, // ✅ Fixed: Use session.user.id
        action: 'role_update',
        target_user_id: state.selectedProfile.user_id,
        previous_value: state.selectedProfile.role,
        new_value: state.newRole
      });

      if (auditError) {
        console.error('[Admin] Audit log error:', auditError);
      }

      // Refresh data
      console.log('[Admin] Refreshing data after role update...');
      await fetchData();
      
      Alert.alert(
        'Success', 
        `Role updated to ${state.newRole.toUpperCase()}`, 
        [{ text: 'OK', onPress: () => {
          console.log('[Admin] Role update confirmed');
          setState(prev => ({ 
            ...prev, 
            selectedProfile: null,
            updatingRole: false 
          }));
        }}]
      );
    } catch (err) {
      console.error('[Admin] Role update failed:', err);
      Alert.alert(
        'Error', 
        err instanceof Error ? err.message : 'Failed to update role'
      );
      setState(prev => ({ ...prev, updatingRole: false }));
    }
  };

  // Load more data for pagination
  const loadMore = () => {
    console.log('[Admin] Loading more data...');
    if (!state.loading && state.hasMore) {
      fetchData(state.page + 1);
    } else {
      console.log('[Admin] Not loading more - loading:', state.loading, 'hasMore:', state.hasMore);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    console.log('[Admin] Refreshing data...');
    fetchData(1, true);
  };

  if (state.loading && !state.refreshing && state.profiles.length === 0) {
    console.log('[Admin] Rendering loading state');
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.error) {
    console.log('[Admin] Rendering error state:', state.error);
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).centerContainer}>
          <Text style={styles(colors).errorText}>{state.error}</Text>
          <TouchableOpacity
            style={styles(colors).retryButton}
            onPress={() => fetchData()}
          >
            <Text style={styles(colors).retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  console.log('[Admin] Rendering main component with', filteredProfiles.length, 'filtered profiles');
  return (
    <SafeAreaView style={styles(colors).container}>
      <ScrollView
        contentContainerStyle={styles(colors).scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
          ) {
            console.log('[Admin] Reached end of scroll, loading more...');
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Header */}
        <View style={styles(colors).header}>
          <Text style={styles(colors).headerTitle}>User Management</Text>
          <Text style={styles(colors).headerSubtitle}>
            {state.profiles.length} users found
          </Text>
        </View>

        {/* Search bar */}
        <View style={styles(colors).searchContainer}>
          <TextInput
            placeholder="Search by name or email..."
            placeholderTextColor={colors.textSecondary}
            value={state.searchQuery}
            onChangeText={(text) => {
              console.log('[Admin] Search query changed:', text);
              setState(prev => ({ ...prev, searchQuery: text }));
            }}
            style={styles(colors).searchInput}
          />
        </View>

        {/* Users table */}
        <View style={styles(colors).table}>
          {/* Table header */}
          <View style={styles(colors).tableRowHeader}>
            <Text style={[styles(colors).tableHeaderText, { flex: 3 }]}>User</Text>
            <Text style={[styles(colors).tableHeaderText, { flex: 1 }]}>Role</Text>
            <Text style={[styles(colors).tableHeaderText, { flex: 1 }]}>Actions</Text>
          </View>

          {/* Table rows */}
          {filteredProfiles.length > 0 ? (
            filteredProfiles.map((profile) => (
              <Animated.View 
                key={profile.user_id} 
                style={styles(colors).tableRow}
                entering={FadeIn.duration(300)}
              >
                <View style={[styles(colors).tableCell, { flex: 3 }]}>
                  <Text style={styles(colors).userName}>
                    {profile.full_name || 'Unknown'}
                  </Text>
                  {profile.email && (
                    <Text style={styles(colors).userEmail}>{profile.email}</Text>
                  )}
                </View>
                <View style={[styles(colors).tableCell, { flex: 1 }]}>
                  <View style={[
                    styles(colors).roleBadge,
                    { backgroundColor: getRoleBadgeColor(profile.role) }
                  ]}>
                    <Text style={styles(colors).roleBadgeText}>
                      {profile.role.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={[styles(colors).tableCell, { flex: 1 }]}>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('[Admin] Edit button pressed for user:', profile.user_id);
                      setState(prev => ({ 
                        ...prev, 
                        selectedProfile: profile,
                        newRole: profile.role
                      }));
                    }}
                    style={styles(colors).editButton}
                  >
                    <Text style={styles(colors).editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))
          ) : (
            <View style={styles(colors).emptyState}>
              <Text style={styles(colors).emptyText}>No users found</Text>
              {state.searchQuery && (
                <TouchableOpacity
                  onPress={() => {
                    console.log('[Admin] Clearing search query');
                    setState(prev => ({ ...prev, searchQuery: '' }));
                  }}
                >
                  <Text style={styles(colors).clearSearchText}>Clear search</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Loading indicator for pagination */}
        {state.loading && state.profiles.length > 0 && (
          <View style={styles(colors).loadingMore}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </ScrollView>

      {/* Role selection modal */}
      {state.selectedProfile && (
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContent}>
            <Text style={styles(colors).modalTitle}>
              Edit {state.selectedProfile.full_name || 'User'}'s Role
            </Text>
            
            <View style={styles(colors).roleOptions}>
              {(['student', 'teacher', 'admin'] as const).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles(colors).roleOption,
                    state.newRole === role && styles(colors).roleOptionSelected
                  ]}
                  onPress={() => {
                    console.log('[Admin] Role option selected:', role);
                    setState(prev => ({ ...prev, newRole: role }));
                  }}
                >
                  <Text style={[
                    styles(colors).roleOptionText,
                    state.newRole === role && styles(colors).roleOptionTextSelected
                  ]}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles(colors).modalButtons}>
              <TouchableOpacity
                style={[styles(colors).modalButton, styles(colors).modalButtonCancel]}
                onPress={() => {
                  console.log('[Admin] Role edit cancelled');
                  setState(prev => ({ ...prev, selectedProfile: null }));
                }}
                disabled={state.updatingRole}
              >
                <Text style={styles(colors).modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles(colors).modalButton, styles(colors).modalButtonConfirm]}
                onPress={updateUserRole}
                disabled={state.updatingRole || state.selectedProfile.role === state.newRole}
              >
                {state.updatingRole ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles(colors).modalButtonConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  errorText: {
    color: colors.error,
    marginBottom: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background,
    fontFamily: 'Inter-SemiBold',
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 48,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textPrimary,
  },
  table: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
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
  tableRowHeader: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableCell: {
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.textSecondary,
  },
  userName: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.textPrimary,
  },
  userEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: 'white',
  },
  editButton: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.primary,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  clearSearchText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.primary,
  },
  loadingMore: {
    padding: 16,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  roleOptions: {
    marginBottom: 20,
  },
  roleOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  roleOptionSelected: {
    backgroundColor: colors.primary,
  },
  roleOptionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.textPrimary,
  },
  roleOptionTextSelected: {
    color: colors.background,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.backgroundSecondary,
    marginRight: 8,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  modalButtonCancelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  modalButtonConfirmText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.background,
  },
});

export default Admin;
