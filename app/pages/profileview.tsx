import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { supabase } from '../utils/supabase';
import { useAuth } from "@/hooks/useAuth";
import { format } from 'date-fns';
import { FontAwesome } from '@expo/vector-icons';
import { Profile, getDisplayName, getProfileImageUrl, getRoleBadgeColor } from '../../models/profile';

export default function ProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth(); // Fixed: using session instead of user

  useEffect(() => {
    async function fetchProfile() {
      try {
        if (!session?.user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, created_at')
          .eq('id', session.user.id)
          .single();

        if (error) {
          throw error;
        }

        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to fetch profile data');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [session]); // Fixed: dependency is now session

  // Rest of your render code remains mostly the same...
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => setLoading(true)} // Retry loading
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Use helper functions from the model
  const displayName = getDisplayName(profile);
  const badgeColor = getRoleBadgeColor(profile.role);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <FontAwesome name="user" size={60} color="#ffffff" />
          </View>
        )}
        <Text style={styles.name}>{displayName}</Text>
        <View style={styles.badgeContainer}>
          <Text style={[styles.roleBadge, { backgroundColor: badgeColor }]}>
            {profile.role}
          </Text>
        </View>
      </View>

      {/* Rest of your component... */}
    </ScrollView>

    
  );
}

// Definisi styles di bagian bawah file
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#bdbdbd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  badgeContainer: {
    marginTop: 8,
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  // Tambahkan style lain yang digunakan
});