import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '@/app/utils/supabase';

export default function TeacherLayout() {
  const { session, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUserRole() {
      if (authLoading) return;
      
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (error) throw error;
        setUserRole(profile?.role || null);
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    }

    checkUserRole();
  }, [session, authLoading]);

  if (authLoading || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ✅ SECURITY: Redirect non-teachers
  if (!session?.user || userRole !== 'teacher') {
    return <Redirect href="/(tabs)" />;
  }

  // ✅ Teacher-only navigation
  return (
    <Stack>
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          title: 'Teacher Dashboard',
          headerShown: false,
           
        }} 
      />
      <Stack.Screen 
        name="manage-lessons" 
        options={{ 
          title: 'Manage Lessons',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="manage-exam" 
        options={{ 
          title: 'Manage Exam',
          headerShown: true 
        }} 
      />
    </Stack>
  );
}