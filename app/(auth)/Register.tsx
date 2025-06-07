//Pages/Register.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';
import { useTheme } from '../context/ThemeContext';

// Define the form data structure
interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

// Define error structure - all fields are optional
interface ErrorState {
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
}

const Register = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ErrorState>({});
  // General error and success states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    // Clear previous messages
    setErrors({});
    setError('');
    setSuccess('');
    
    let isValid = true;
    const newErrors: ErrorState = {};
    
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFullName = fullName.trim();

    // Validation
    if (!trimmedFullName || trimmedFullName.length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters long';
      isValid = false;
    }

    // Validate email
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required';
      isValid = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }
    
    // Validate password
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
      isValid = false;
    }
    
    // Validate confirm password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    // If validation fails, set errors and return
    if (!isValid) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setLoading(true);
      
      // Step 1: Create authentication user
      const { data, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedFullName,
            role: 'student'
          },
        },
      });
      
      if (authError) {
        console.error("Full signup error:", JSON.stringify(authError));
        
        // setError for Text display
        switch (authError.message) {
          case 'User already registered':
            setError('An account with this email address already exists. Please login instead or try a different email address.');
            setTimeout(() => {
              router.replace('/(auth)/Login');
            }, 3000);
            return;
          case 'Password should be at least 6 characters':
            setErrors({ password: 'Password must be at least 6 characters long' });
            return;
          case 'Signup is disabled':
            setError('New user registration is currently disabled. Please contact support for assistance.');
            return;
          case 'Invalid email':
            setErrors({ email: 'Please enter a valid email address' });
            return;
          case 'Email rate limit exceeded':
            setError('Too many registration attempts. Please wait a few minutes before trying again.');
            return;
          default:
            // Check for common error patterns
            if (authError.message.includes('already been taken') || 
                authError.message.includes('already registered') ||
                authError.message.includes('duplicate key') ||
                authError.message.includes('unique constraint')) {
              setError('This email address is already registered. Please login with your existing account or use a different email address.');
              setTimeout(() => {
                router.replace('/(auth)/Login');
              }, 3000);
              return;
            }
            
            // Handle email format errors
            if (authError.code === 'email_address_invalid' || 
                authError.message.includes('email format')) {
              setErrors({
                email: 'This email address format is not valid. Please check and try again.'
              });
              return;
            }

            // Handle password errors
            if (authError.message.includes('password')) {
              setErrors({
                password: 'Password requirements not met. Please use at least 6 characters.'
              });
              return;
            }
            
            // Generic error for other cases
            setError(`Unable to create account: ${authError.message}. Please try again or contact support.`);
            return;
        }
      }
      
      // Step 2: Create profile entry in the profiles table
      if (data?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              user_id: data.user.id,
              full_name: trimmedFullName,
              role: 'student' // Default role from your schema
            }
          ]);
          
        if (profileError) {
          console.error('Profile creation error:', profileError);
          
          if (profileError.message.includes('duplicate key')) {
            setError('Your account was created but there was an issue setting up your profile. Please try logging in.');
            setTimeout(() => {
              router.replace('/(auth)/Login');
            }, 3000);
            return;
          }
          
          // Continue anyway as the auth user is created
          console.warn('Profile creation failed but auth user created successfully');
        }
      }
      
      if (data?.user && data?.session) {
        // Direct login successful (no email confirmation required)
        setSuccess(`Welcome ${trimmedFullName}! Your account has been created successfully. You are now logged in.`);
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2000);
      } else if (data?.user && !data?.session) {
        // Email confirmation required
        setSuccess(`Thank you for registering, ${trimmedFullName}! We've sent a verification email to ${trimmedEmail}. Please check your inbox and click the verification link to activate your account.`);
        setTimeout(() => {
          router.replace('/(auth)/Login');
        }, 3000);
      } else {
        // Unexpected case
        setError('There was an issue completing your registration. Please try logging in or contact support if the problem persists.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError('An unexpected error occurred during registration. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join us to start learning</Text>

      <View style={styles.form}>
        {/* General Error Message Display */}
        {error ? (
          <View style={styles.messageContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        ) : null}

        {/* Success Message Display */}
        {success ? (
          <View style={styles.messageContainer}>
            <Text style={styles.successText}>✅ {success}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={[styles.input, errors.fullName ? styles.inputError : null]}
          placeholder="Enter your full name"
          placeholderTextColor={colors.textTertiary}
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            // Clear errors when user starts typing
            if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined }));
          }}
        />
        {errors.fullName && <Text style={styles.fieldErrorText}>{errors.fullName}</Text>}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, errors.email ? styles.inputError : null]}
          placeholder="Enter your email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            // Clear errors when user starts typing
            if (errors.email || error) {
              setErrors(prev => ({ ...prev, email: undefined }));
              setError('');
            }
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {errors.email && <Text style={styles.fieldErrorText}>{errors.email}</Text>}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={[styles.input, errors.password ? styles.inputError : null]}
          placeholder="Enter your password (min. 6 characters)"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            // Clear errors when user starts typing
            if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
          }}
          secureTextEntry
        />
        {errors.password && <Text style={styles.fieldErrorText}>{errors.password}</Text>}

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
          placeholder="Confirm your password"
          placeholderTextColor={colors.textTertiary}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            // Clear errors when user starts typing
            if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
          }}
          secureTextEntry
        />
        {errors.confirmPassword && <Text style={styles.fieldErrorText}>{errors.confirmPassword}</Text>}

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/Login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Login</Text>
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
      fontFamily: 'Inter-Bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textSecondary,
      marginBottom: 32,
    },
    form: {
      width: '100%'
    },
    // Message container styles
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
      fontFamily: 'Inter-Medium',
      color: colors.textPrimary,
      marginBottom: 8
    },
    input: {
      backgroundColor: colors.background,
      height: 50,
      borderRadius: 8,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.textPrimary,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border || '#E1E1E1'
    },
    inputError: {
      borderWidth: 2,
      borderColor: colors.error
    },
    // Separate field-specific error text
    fieldErrorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: -12,
      marginBottom: 12,
      fontFamily: 'Inter-Regular'
    },
    button: {
      backgroundColor: colors.primary,
      height: 50,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16
    },
    // Disabled button styling
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontFamily: 'Inter-SemiBold'
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24
    },
    footerText: {
      color: colors.textSecondary,
      fontFamily: 'Inter-Regular'
    },
    footerLink: {
      color: colors.primary,
      fontFamily: 'Inter-SemiBold',
      marginLeft: 6
    }
  });

export default Register;