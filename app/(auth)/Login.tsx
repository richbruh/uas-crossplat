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

const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please fill in all fields');
    return;
  }

  setLoading(true);
  try {
    console.log('Attempting login with:', { email }); // Don't log passwords
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name
      });
      
      // More descriptive error message
      let errorMessage = `${error.message}\nStatus: ${error.status || 'N/A'}\nCode: ${error.code || 'N/A'}`;
      Alert.alert('Login Failed', errorMessage);
    } else {
      console.log('Login successful');
      router.replace('/(tabs)');
    }
  } catch (unexpectedError) {
    console.error('Unexpected error during login:', unexpectedError);
    Alert.alert('Login Error', 'An unexpected error occurred. Please try again later.');
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

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

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
