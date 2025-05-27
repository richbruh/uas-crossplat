import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';
import { useTheme } from '../app/context/ThemeContext';
import { useAuth } from '../app/context/AuthContext';
import { supabase } from '@/app/utils/supabase';
import { Course } from '@/models/course';

interface MakeCourseFormProps {
  onSuccess?: (course: Course) => void;
  onCancel?: () => void;
}

interface CourseFormData {
  title: string;
  grade_level: number;
  description: string;
  thumbnail_url: string | null;
  total_lessons: number;
}

// Fix: Define proper error types
interface FormErrors {
  title?: string;
  grade_level?: string;
  description?: string;
  total_lessons?: string;
  thumbnail_url?: string;
}

const GRADE_LEVELS = [1, 2, 3, 4, 5, 6];

export default function MakeCourseForm({ onSuccess, onCancel }: MakeCourseFormProps) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    grade_level: 1,
    description: '',
    thumbnail_url: null,
    total_lessons: 1 // Fix: Start with 1 instead of 0
  });

  // Form validation errors - Fix: Use proper error type
  const [errors, setErrors] = useState<FormErrors>({});

  const styles = getStyles(colors);

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Course title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Course title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Course description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (formData.total_lessons < 1) {
      newErrors.total_lessons = 'Must have at least 1 lesson';
    } else if (formData.total_lessons > 100) {
      newErrors.total_lessons = 'Cannot exceed 100 lessons';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle image selection
  const selectImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageLoading(true);
        
        // For now, just use the local URI
        // In production, you would upload to Supabase Storage
        setFormData(prev => ({
          ...prev,
          thumbnail_url: result.assets[0].uri
        }));
      }
    } catch (error: any) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setImageLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'You must be logged in to create a course');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Create course in database
      const { data, error } = await supabase
        .from('courses')
        .insert([
          {
            title: formData.title.trim(),
            grade_level: formData.grade_level,
            description: formData.description.trim(),
            thumbnail_url: formData.thumbnail_url,
            teacher_id: session.user.id,
            total_lessons: formData.total_lessons
          }
        ])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success', 
        'Course created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSuccess) {
                onSuccess(data as Course);
              }
            }
          }
        ]
      );

      // Reset form
      setFormData({
        title: '',
        grade_level: 1,
        description: '',
        thumbnail_url: null,
        total_lessons: 1
      });
      setErrors({});
      
    } catch (error: any) {
      console.error('Error creating course:', error);
      Alert.alert('Error', error.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Create New Course</Text>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Course Title */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Course Title *</Text>
        <TextInput
          style={[
            styles.textInput,
            errors.title ? styles.inputError : null // Fix: Proper conditional styling
          ]}
          placeholder="Enter course title"
          placeholderTextColor={colors.textSecondary}
          value={formData.title}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, title: text }));
            if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
          }}
          maxLength={100}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
      </View>

      {/* Grade Level */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Grade Level *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.grade_level}
            onValueChange={(value: number) => setFormData(prev => ({ ...prev, grade_level: value }))} // Fix: Add type annotation
            style={styles.picker}
            dropdownIconColor={colors.textSecondary}
          >
            {GRADE_LEVELS.map(level => (
              <Picker.Item
                key={level}
                label={`Grade ${level}`}
                value={level}
                color={Platform.OS === 'ios' ? colors.textPrimary : undefined}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Total Lessons */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Total Lessons *</Text>
        <TextInput
          style={[
            styles.textInput,
            errors.total_lessons ? styles.inputError : null // Fix: Proper conditional styling
          ]}
          placeholder="Number of lessons"
          placeholderTextColor={colors.textSecondary}
          value={formData.total_lessons.toString()}
          onChangeText={(text) => {
            const number = parseInt(text) || 1; // Fix: Default to 1 instead of 0
            setFormData(prev => ({ ...prev, total_lessons: number }));
            if (errors.total_lessons) setErrors(prev => ({ ...prev, total_lessons: undefined }));
          }}
          keyboardType="numeric"
          maxLength={3}
        />
        {errors.total_lessons && <Text style={styles.errorText}>{errors.total_lessons}</Text>}
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[
            styles.textAreaInput,
            errors.description ? styles.inputError : null // Fix: Proper conditional styling
          ]}
          placeholder="Enter course description"
          placeholderTextColor={colors.textSecondary}
          value={formData.description}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, description: text }));
            if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
          }}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        <Text style={styles.characterCount}>
          {formData.description.length}/500 characters
        </Text>
      </View>

      {/* Thumbnail Image */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Course Thumbnail</Text>
        
        {formData.thumbnail_url ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: formData.thumbnail_url }} style={styles.thumbnailImage} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setFormData(prev => ({ ...prev, thumbnail_url: null }))}
            >
              <X size={20} color={colors.background} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imageUploadButton} onPress={selectImage} disabled={imageLoading}>
            {imageLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Camera size={24} color={colors.textSecondary} />
                <Text style={styles.imageUploadText}>Add Thumbnail</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>Create Course</Text>
          )}
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity
            style={[styles.button, styles.cancelButtonBottom]}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: typeof import('@/constants/Colors').default.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      color: colors.textPrimary,
    },
    cancelButton: {
      padding: 8,
    },
    inputGroup: {
      marginBottom: 24,
      paddingHorizontal: 16,
    },
    label: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.card,
    },
    textAreaInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.card,
      minHeight: 120,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    picker: {
      height: 50,
      color: colors.textPrimary,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      color: colors.error,
      marginTop: 4,
    },
    characterCount: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'right',
    },
    imageContainer: {
      position: 'relative',
      alignSelf: 'flex-start',
    },
    thumbnailImage: {
      width: 200,
      height: 120,
      borderRadius: 12,
      resizeMode: 'cover',
    },
    removeImageButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: colors.error,
      borderRadius: 12,
      padding: 4,
    },
    imageUploadButton: {
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: 12,
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSecondary,
    },
    imageUploadText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 8,
    },
    buttonContainer: {
      padding: 16,
      paddingBottom: 32,
    },
    button: {
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    submitButton: {
      backgroundColor: colors.primary,
    },
    submitButtonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.background,
    },
    cancelButtonBottom: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.textSecondary,
    },
  });