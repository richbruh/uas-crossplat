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

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  // In your Login.tsx
const handleLogin = async () => {
  try {
    setLoading(true);

    // Clear Previous Messages
    setError('');
    setSuccess('');
    console.log('[Login] Attempting login with:', { email });
    
    // Validate Input before sending request 
    if (!email.trim()) {
        setError('Please enter your email address');
        return;
    }

    if (!password){
        setError('Please enter your password');
        return;
    }
    const { error } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
      password 
    });    

    if (error) {
      console.error('[Login] Authentication error:', error);
      
      // Handle specific error cases
      switch (error.message) {
        case 'Invalid login credentials':
            setError('The email or password you entered is incorrect. Please check your credentials and try again.');
          return;
        case 'Email not confirmed':
            setError('Please check your email and click the verification link before logging in. Check your spam folder if you don\'t see the email.');
          return;
        case 'Too many requests':
             setError('Too many failed login attempts. Please wait a few minutes before trying again.');
          return;
        case 'Email address not found':
            setError('No account found with this email address. Please check your email or register for a new account.');
          return;
        case 'Incorrect password':
            setError('The password you entered is incorrect. Please try again or reset your password if you\'ve forgotten it.');
          return;
        case 'User not found':
            setError('No account found with this email address. Please register for a new account.');
          return;
        default:
          // Check for common error patterns
            if (error.message.toLowerCase().includes('password')) {
              setError('There was an issue with your password. Please check and try again.');
            } else if (error.message.toLowerCase().includes('email')) {
              setError('There was an issue with your email address. Please check and try again.');
            } else if (error.message.toLowerCase().includes('network')) {
              setError('Network connection failed. Please check your internet connection and try again.');
            } else {
              setError(`Login failed: ${error.message}. Please try again.`);
            }
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
        Alert.alert(
          'Profile Error', 
          'Could not load your profile information. Please contact support if this problem persists.'
        );
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

      // Show Success Message
        setSuccess(`Welcome back, ${profile.role}! Login successful.`);
        
        // Redirect after a short delay to show success message
        setTimeout(() => {
          console.log('[Login] Redirecting based on role:', profile.role);
          router.replace('/(tabs)');
        }, 1500);
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
        {/* ✅ NEW: Error Message Display */}
        {error ? (
          <View style={styles.messageContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        ) : null}

        {/* ✅ NEW: Success Message Display */}
        {success ? (
          <View style={styles.messageContainer}>
            <Text style={styles.successText}>✅ {success}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, error && error.toLowerCase().includes('email') ? styles.inputError : null]}
          placeholder="Enter your email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            // Clear error when user starts typing
            if (error) setError('');
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={[styles.input, error && error.toLowerCase().includes('password') ? styles.inputError : null]}
          placeholder="Enter your password"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            // Clear error when user starts typing
            if (error) setError('');
          }}
          secureTextEntry
        />

        <Link href="/(auth)/ChangePassword" asChild>
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
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
    // ✅ NEW: Message container styles
    messageContainer: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    errorText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.error,
      textAlign: 'center',
      lineHeight: 20,
    },
    successText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.success || '#16a34a',
      textAlign: 'center',
      lineHeight: 20,
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
    // ✅ NEW: Input error styling
    inputError: {
      borderColor: colors.error,
      borderWidth: 2,
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
    // ✅ NEW: Disabled button styling
    buttonDisabled: {
      opacity: 0.7,
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
