import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '@/app/utils/supabase';

export default function AdminLayout() {
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

  //Redirect student
  if (!session?.user || userRole !== 'admin') {
    return <Redirect href="/(tabs)" />;
  }

  // ✅ Admin-only navigation
  return (
    <Stack>
      <Stack.Screen 
        name="admin" 
        options={{ 
          title: 'Admin Dashboard',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="admin2" 
        options={{ 
          title: 'Admin Panel v2',
          headerShown: false,
        }} 
      />
    </Stack>
  );
}