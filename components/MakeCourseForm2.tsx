import React, { useState, useEffect } from 'react';
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
  course?: Course;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CourseFormData {
  title: string;
  grade_level: number;
  description: string;
  thumbnail_url: string | null;
  total_lessons: number;
  teacher_id: string;
}

interface TeacherOption {
  user_id: string;
  full_name: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  total_lessons?: string;
  teacher_id?: string;
  grade_level?: string;
}

const GRADE_LEVELS = [1, 2, 3, 4, 5, 6];

export default function MakeCourseForm({ course, onSuccess, onCancel }: MakeCourseFormProps) {
  console.log('[MakeCourseForm] Rendering with course:', course?.id || 'new');
  const { colors } = useTheme();
  const { session } = useAuth();
  
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    grade_level: 1,
    description: '',
    thumbnail_url: null,
    total_lessons: 1,
    teacher_id: ''
  });

  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [fetchingTeachers, setFetchingTeachers] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const styles = createStyles(colors);

  // Fetch teachers list
  useEffect(() => {
    console.log('[MakeCourseForm] useEffect - Fetching teachers');
    const fetchTeachers = async () => {
      console.log('[TEACHERS] Starting teacher fetch');
      try {
        setFetchingTeachers(true);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('role', 'teacher')
          .order('full_name', { ascending: true });

        console.log('[TEACHERS] Fetch result:', { data, error });
        
        if (error) {
          console.error('[TEACHERS] Fetch error:', error);
          throw error;
        }
        
        setTeachers(data || []);
        console.log('[TEACHERS] Set teachers:', data?.length || 0);
        
        // Set default teacher to current user if they're a teacher
        if (session?.user && !course) {
          console.log('[TEACHERS] Checking if current user is teacher');
          const currentUserIsTeacher = data?.some(t => t.user_id === session.user.id);
          if (currentUserIsTeacher) {
            console.log('[TEACHERS] Setting current user as default teacher');
            setFormData(prev => ({ ...prev, teacher_id: session.user.id }));
          }
        }
      } catch (error) {
        console.error('[ERROR] fetchTeachers:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        Alert.alert('Error', 'Failed to load teachers list');
      } finally {
        setFetchingTeachers(false);
      }
    };

    fetchTeachers();
  }, [session]);

  // Initialize form with course data if in edit mode
  useEffect(() => {
    console.log('[MakeCourseForm] useEffect - Initializing form');
    if (course) {
      console.log('[FORM] Initializing with course data:', {
        id: course.id,
        title: course.title,
        teacher: course.teacher_id
      });
      setFormData({
        title: course.title,
        grade_level: course.grade_level,
        description: course.description,
        thumbnail_url: course.thumbnail_url,
        total_lessons: course.total_lessons,
        teacher_id: course.teacher_id
      });
    } else {
      console.log('[FORM] Initializing empty form for new course');
    }
  }, [course]);

  const validateForm = (): boolean => {
    console.log('[VALIDATION] Validating form...');
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Course title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (formData.total_lessons < 1) {
      newErrors.total_lessons = 'Must have at least 1 lesson';
    } else if (formData.total_lessons > 100) {
      newErrors.total_lessons = 'Cannot exceed 100 lessons';
    }

    if (!formData.teacher_id) {
      newErrors.teacher_id = 'Please select a teacher';
    }

    if (!formData.grade_level || formData.grade_level < 1 || formData.grade_level > 6) {
      newErrors.grade_level = 'Please select a valid grade level';
    }

    console.log('[VALIDATION] Errors found:', Object.keys(newErrors).length);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async () => {
    console.log('[IMAGE] Starting image upload process');
    try {
      console.log('[IMAGE] Requesting permissions...');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        console.warn('[PERMISSION] Photo library access denied');
        Alert.alert('Permission required', 'Please allow access to your photos');
        return;
      }

      console.log('[IMAGE] Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      console.log('[IMAGE] Picker result:', result);
      
      if (!result.canceled && result.assets[0]) {
        console.log('[IMAGE] Image selected:', result.assets[0].uri);
        setImageLoading(true);
        setFormData(prev => ({
          ...prev,
          thumbnail_url: result.assets[0].uri
        }));
        console.log('[IMAGE] Thumbnail URL updated');
      } else {
        console.log('[IMAGE] Image selection canceled');
      }
    } catch (error) {
      console.error('[ERROR] handleImageUpload:', {
        message: error.message,
        stack: error.stack
      });
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async () => {
    console.log('[SUBMIT] Form submission started');
    if (!validateForm()) {
      console.log('[VALIDATION] Form validation failed', errors);
      return;
    }
    
    if (!session?.user) {
      const errorMsg = 'Authentication required - no session user';
      console.error('[AUTH] Error:', errorMsg);
      Alert.alert('Error', errorMsg);
      return;
    }

    console.log('[SUBMIT] Form data:', JSON.stringify(formData, null, 2));
    setLoading(true);

    try {
      const courseData = {
        title: formData.title.trim(),
        grade_level: formData.grade_level,
        description: formData.description.trim(),
        thumbnail_url: formData.thumbnail_url,
        total_lessons: formData.total_lessons,
        teacher_id: formData.teacher_id,
        updated_at: new Date().toISOString()
      };

      console.log('[COURSE] Prepared course data:', courseData);

      if (course) {
        console.log('[COURSE] Updating existing course:', course.id);
        const { data, error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', course.id)
          .select();

        console.log('[COURSE] Update response:', { data, error });
        
        if (error) {
          console.error('[COURSE] Update error:', {
            message: error.message,
            code: error.code,
            details: error.details
          });
          throw error;
        }
        
        console.log('[COURSE] Update successful:', data);
        Alert.alert('Success', 'Course updated successfully');
      } else {
        console.log('[COURSE] Creating new course');
        const { data, error } = await supabase
          .from('courses')
          .insert([courseData])
          .select();

        console.log('[COURSE] Create response:', { data, error });
        
        if (error) {
          console.error('[COURSE] Create error:', {
            message: error.message,
            code: error.code,
            details: error.details
          });
          throw error;
        }
        
        console.log('[COURSE] Create successful:', data);
        Alert.alert('Success', 'Course created successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('[ERROR] handleSubmit:', {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      });
      Alert.alert('Error', error.message || 'Failed to save course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>{course ? 'Edit Course' : 'Create Course'}</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Course Title */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Course Title *</Text>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
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
        <View style={[styles.pickerContainer, errors.grade_level && styles.pickerError]}>
          <Picker
            selectedValue={formData.grade_level}
            onValueChange={(value) => {
              setFormData(prev => ({ ...prev, grade_level: value }));
              if (errors.grade_level) setErrors(prev => ({ ...prev, grade_level: undefined }));
            }}
            style={styles.picker}
            dropdownIconColor={colors.textSecondary}
          >
            {GRADE_LEVELS.map(level => (
              <Picker.Item
                key={level}
                label={`Grade ${level}`}
                value={level}
              />
            ))}
          </Picker>
        </View>
        {errors.grade_level && <Text style={styles.errorText}>{errors.grade_level}</Text>}
      </View>

      {/* Teacher Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Teacher *</Text>
        {fetchingTeachers ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View style={[styles.pickerContainer, errors.teacher_id && styles.pickerError]}>
            <Picker
              selectedValue={formData.teacher_id}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, teacher_id: value }));
                if (errors.teacher_id) setErrors(prev => ({ ...prev, teacher_id: undefined }));
              }}
              style={styles.picker}
              dropdownIconColor={colors.textSecondary}
            >
              <Picker.Item 
                label="Select a teacher" 
                value="" 
                color={colors.textSecondary}
              />
              {teachers.map(teacher => (
                <Picker.Item
                  key={teacher.user_id}
                  label={teacher.full_name}
                  value={teacher.user_id}
                />
              ))}
            </Picker>
          </View>
        )}
        {errors.teacher_id && <Text style={styles.errorText}>{errors.teacher_id}</Text>}
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[
            styles.textArea,
            errors.description && styles.inputError
          ]}
          placeholder="Describe your course..."
          placeholderTextColor={colors.textSecondary}
          value={formData.description}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, description: text }));
            if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
          }}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={styles.charCounter}>
          {formData.description.length}/500 characters
        </Text>
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
      </View>

      {/* Thumbnail */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Course Thumbnail</Text>
        {formData.thumbnail_url ? (
          <View style={styles.thumbnailContainer}>
            <Image 
              source={{ uri: formData.thumbnail_url }} 
              style={styles.thumbnailImage} 
            />
            <TouchableOpacity
              style={styles.removeThumbnail}
              onPress={() => {
                console.log('[IMAGE] Removing thumbnail');
                setFormData(prev => ({ ...prev, thumbnail_url: null }));
              }}
            >
              <X size={18} color={colors.background} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.uploadButton}
            onPress={handleImageUpload}
            disabled={imageLoading}
          >
            {imageLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Camera size={24} color={colors.textSecondary} />
                <Text style={styles.uploadText}>Upload Thumbnail</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Total Lessons */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Total Lessons *</Text>
        <TextInput
          style={[styles.input, errors.total_lessons && styles.inputError]}
          placeholder="Number of lessons"
          placeholderTextColor={colors.textSecondary}
          value={formData.total_lessons.toString()}
          onChangeText={(text) => {
            const num = parseInt(text) || 0;
            setFormData(prev => ({ ...prev, total_lessons: num }));
            if (errors.total_lessons) setErrors(prev => ({ ...prev, total_lessons: undefined }));
          }}
          keyboardType="numeric"
        />
        {errors.total_lessons && <Text style={styles.errorText}>{errors.total_lessons}</Text>}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>
              {course ? 'Update Course' : 'Create Course'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => {
            console.log('[NAV] Cancel button pressed');
            onCancel();
          }}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
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
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
  textArea: {
    height: 120,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  charCounter: {
    textAlign: 'right',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  removeThumbnail: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    borderRadius: 12,
    padding: 6,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    gap: 8,
  },
  uploadText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  pickerContainer: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 0,
    height: 50,
  },
  picker: {
    color: colors.textPrimary,
    height: '100%',
  },
  pickerError: {
    borderColor: colors.error,
  },
  buttonGroup: {
    paddingHorizontal: 16,
    gap: 12,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.background,
  },
});
