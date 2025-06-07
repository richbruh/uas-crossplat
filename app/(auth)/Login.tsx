// ./(auth)/Login.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // In your Login.tsx
const handleLogin = async () => {
  try {
    setLoading(true);
    console.log('[Login] Attempting login with:', { email });
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('[Login] Authentication error:', error);
      
      // Handle specific error cases
      switch (error.message) {
        case 'Invalid login credentials':
          Alert.alert('Login Failed', 'Invalid email or password. Please check your credentials and try again.');
          return;
        case 'Email not confirmed':
          Alert.alert('Email Not Verified', 'Please check your email and click the verification link before logging in.');
          return;
        case 'Too many requests':
          Alert.alert('Too Many Attempts', 'Too many login attempts. Please wait a moment before trying again.');
          return;
        default:
          // Generic error message for other cases
          Alert.alert('Login Failed', error.message || 'Unable to login. Please try again.');
          return;
      }
    }

    console.log('[Login] Login successful, getting user data...');
    
    // Force fresh data
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[Login] Retrieved user:', JSON.stringify(user, null, 2));
    
    if (user?.id) {
      console.log('[Login] Fetching profile for user ID:', user.id);
      
      // Get true source of truth from database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('[Login] Profile fetch error:', profileError);
        Alert.alert('Profile Error', 'Could not fetch user profile. Please contact support.');
        return;
      }
      
      console.log('[Login] Retrieved profile:', JSON.stringify(profile, null, 2));

      // Clean up all role declarations
      console.log('[Login] Updating user metadata with role:', profile.role);
      await supabase.auth.updateUser({
        data: { 
          role: profile.role,
          // Remove conflicting declarations
          identity_data: null 
        }
      });

      // Redirect based on role
      console.log('[Login] Redirecting based on role:', profile.role);
      switch(profile.role) {
        case 'admin':
          router.replace('/(tabs)');
          break;
        case 'teacher':
          router.replace('/(tabs)');
          break;
        default: // student or any other role
          router.replace('/(tabs)');
      }
      return;
    }

    console.log('[Login] No user ID found, default redirect');
    router.replace('/(tabs)');
  } catch (error) {
    console.error('[Login] Unexpected error:', error);
    Alert.alert('Login Error', 'An unexpected error occurred. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Login to continue learning</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Link href="/(auth)/ChangePassword" asChild>
        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity></Link>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Link href="/(auth)/Register" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
};

const getStyles = (colors: typeof import('@/constants/Colors').default.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      backgroundColor: colors.background,
      justifyContent: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 8,
      fontFamily: 'Inter-Bold',
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 32,
      fontFamily: 'Inter-Regular',
    },
    form: {
      width: '100%',
    },
    label: {
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 8,
      fontFamily: 'Inter-Medium',
    },
    input: {
      height: 50,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      marginBottom: 16,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      backgroundColor: colors.background,
      color: colors.textPrimary,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: 24,
    },
    forgotPasswordText: {
      color: colors.primary,
      fontSize: 14,
      fontFamily: 'Inter-Medium',
    },
    button: {
      height: 50,
      backgroundColor: colors.primary,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      marginRight: 4,
    },
    footerLink: {
      color: colors.primary,
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
    },
  });

export default Login;
