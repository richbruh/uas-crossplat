import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Modal,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Settings, Award, Book, BookOpen } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { supabase } from '../utils/supabase';
import { useAuth } from '@/hooks/useAuth';
import SectionHeader from '@/components/SectionHeader';
import { useTheme } from '../context/ThemeContext';
import { profile as ProfileType, getRoleBadgeColor as getModelRoleBadgeColor } from '@/models/profile';
import { useRouter } from 'expo-router';

// -----------------------------
// Constants
// -----------------------------
const THEME_OPTIONS = [
    { value: 'light', label: 'Light Theme' },
    { value: 'dark', label: 'Dark Theme' },
];

const ERROR_TYPES = {
    AUTH: 'auth_error',
    DATA: 'network_error'
};

const DEFAULT_USER_STATS= {
    coursesCompleted: 0,
    enrolledCourses: 0,
    totalHoursLearned: 0,
}

interface UserStats {
    completedCourses: number;
    enrolledCourses: number;
}