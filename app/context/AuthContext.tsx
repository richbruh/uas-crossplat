import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/app/utils/supabase';
import { Alert } from 'react-native';

interface AuthContextType {
  session: Session | null;
  user: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any, data: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, data: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('❌ useAuth must be used within AuthProvider');
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔧 AuthProvider initializing...');
    
    const getSession = async () => {
      try {
        console.log('🔍 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📱 Initial session result:', { session: !!session, error, userId: session?.user?.id });
        
        if (error) {
          console.error('❌ Error getting session:', error.message);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        console.log('✅ Session state updated:', { hasSession: !!session, hasUser: !!session?.user });
      } catch (err) {
        console.error('💥 Exception in getSession:', err);
        setLoading(false);
      }
    };

    getSession();

    // Set up auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔄 Auth event: ${event}`, { hasSession: !!session, userId: session?.user?.id });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth listener');
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 Attempting sign in for:', email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      console.log('✅ Sign in successful');
      return { error: null };
    } catch (error: any) {
      console.error('❌ Error signing in:', error.message);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('📝 Attempting sign up for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: data.user.id,
              full_name: fullName,
              role: 'student'
            }
          ]);

        if (profileError) {
          console.error('❌ Error creating profile:', profileError.message);
        }
      }

      console.log('✅ Sign up successful');
      return { error: null, data };
    } catch (error: any) {
      console.error('❌ Error signing up:', error.message);
      return { error, data: null };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('✅ Sign out successful');
    } catch (error: any) {
      console.error('❌ Error signing out:', error.message);
      Alert.alert('Error signing out', error.message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'io.supabase.elearning://reset-password/',
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('❌ Error resetting password:', error.message);
      return { error };
    }
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  console.log('🎯 AuthContext value:', { 
    hasSession: !!session, 
    hasUser: !!user, 
    loading, 
    userId: user?.id 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;