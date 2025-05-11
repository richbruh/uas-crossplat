//Pages/Register.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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
  const router = useRouter();

  const handleRegister = async () => {
    // Reset error states
    setErrors({});
    let isValid = true;
    const newErrors: ErrorState = {};
    
    // Validate email
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }
    
    // Validate password - must be at least 6 characters
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }
    
    // Validate confirm password
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    // Validate fullName
    if (!fullName || fullName.trim().length === 0) {
      newErrors.fullName = 'Name cannot be empty';
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) {
        console.error("Full signup error:", JSON.stringify(error));
        Alert.alert('Registration Error', `${error.message} (${error.status || 'unknown status'})`);
        return;
      }
      
      // Step 2: Create profile entry in the profiles table
      if (data?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              user_id: data.user.id,
              full_name: fullName,
              role: 'student' // Default role from your schema
            }
          ]);
          
        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Continue anyway as the auth user is created
        }
      }
      
      // Check if email confirmation is required
      if (data?.user && data?.session) {
        // Direct login successful
        Alert.alert('Success', 'Registration successful!');
        router.replace('/(tabs)');
      } else {
        // Email confirmation required
        Alert.alert(
          'Email Verification Required',
          'Please check your email for a confirmation link before logging in.'
        );
        router.replace('/(auth)/Login');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join us to start learning</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={[styles.input, errors.fullName ? styles.inputError : null]}
          placeholder="Enter your full name"
          placeholderTextColor={colors.textTertiary}
          value={fullName}
          onChangeText={setFullName}
        />
        {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, errors.email ? styles.inputError : null]}
          placeholder="Enter your email"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={[styles.input, errors.password ? styles.inputError : null]}
          placeholder="Enter your password"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
          placeholder="Confirm your password"
          placeholderTextColor={colors.textTertiary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
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
    padding: 20,
    backgroundColor: colors.background
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#000', // Fixed color reference
    marginTop: 60
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 40
  },
  form: {
    width: '100%'
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#000', // Fixed color reference
    marginBottom: 8
  },
  input: {
    backgroundColor: colors.background, // Fixed color reference
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#000', // Fixed color reference
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E1E1E1'
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#ff3b30'
  },
  errorText: {
    color: '#ff3b30',
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium'
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
    fontFamily: 'Inter-Medium',
    marginLeft: 6
  }
});

export default Register;
