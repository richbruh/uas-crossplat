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
import { Camera, X, Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../app/context/ThemeContext';
import { useAuth } from '../app/context/AuthContext';
import { supabase } from '@/app/utils/supabase';
import { Lesson } from '@/models/lesson';

interface MakeLessonFormProps {
  courseId: string;
  onSuccess: () => void;
  onCancel: () => void;
  existingLesson?: Lesson;
}

interface LessonFormData {
  title: string;
  content: string;
  lesson_order: number;
  course_id: string;
}

const MakeLessonForm: React.FC<MakeLessonFormProps> = ({
  courseId,
  onSuccess,
  onCancel,
  existingLesson
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { session } = useAuth();

  const [formData, setFormData] = useState<LessonFormData>({
    title: '',
    content: '',
    lesson_order: 1,
    course_id: courseId,
  });

  const [errors, setErrors] = useState<Partial<LessonFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [nextOrderNumber, setNextOrderNumber] = useState(1);

  useEffect(() => {
    console.log('Fetching next lesson order for course:', courseId);
    const fetchNextOrderNumber = async () => {
      try {
        const { data: lessons, error } = await supabase
          .from('lessons')
          .select('lesson_order')
          .eq('course_id', courseId)
          .order('lesson_order', { ascending: false })
          .limit(1);

        if (error) throw error;
        console.log('Fetched lesson order data:', lessons);

        const maxOrder = lessons?.[0]?.lesson_order || 0;
        setNextOrderNumber(maxOrder + 1);

        if (!existingLesson) {
          setFormData(prev => ({ ...prev, lesson_order: maxOrder + 1 }));
        }
      } catch (error) {
        console.error('Error fetching lesson order:', error);
      }
    };

    fetchNextOrderNumber();
  }, [courseId, existingLesson]);

  useEffect(() => {
    if (existingLesson) {
      console.log('Editing existing lesson:', existingLesson);
      setFormData({
        title: existingLesson.title,
        content: existingLesson.content || '',
        lesson_order: existingLesson.lesson_order,
        course_id: existingLesson.course_id,
      });
    }
  }, [existingLesson]);

  const validateForm = (): boolean => {
    const newErrors: Partial<LessonFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Lesson title is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Lesson content is required';
    }

    if (formData.lesson_order < 1) {
      newErrors.lesson_order = 'Lesson order must be at least 1';
    }

    setErrors(newErrors);
    console.log('Validation result:', newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    console.log('Submitting form data:', formData);

    try {
      const lessonData = {
        ...formData,
        teacher_id: session?.user.id,
      };

      if (existingLesson) {
        console.log('Updating lesson:', existingLesson.id);
        const { error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', existingLesson.id);

        if (error) throw error;
        console.log('Lesson updated successfully.');
      } else {
        console.log('Inserting new lesson');
        const { error } = await supabase
          .from('lessons')
          .insert(lessonData);

        if (error) throw error;
        console.log('Lesson created successfully.');
      }

      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save lesson');
      console.error('Error saving lesson:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {existingLesson ? 'Edit Lesson' : 'Create New Lesson'}
        </Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Lesson Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lesson Title *</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="Enter lesson title"
            placeholderTextColor={colors.textSecondary}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            maxLength={100}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>
        
        {/* Lesson Order */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lesson Order *</Text>
          <View style={styles.orderInputContainer}>
            <TouchableOpacity
              style={styles.orderButton}
              onPress={() => setFormData({ ...formData, lesson_order: Math.max(1, formData.lesson_order - 1) })}
              disabled={formData.lesson_order <= 1}
            >
              <ChevronDown size={20} color={formData.lesson_order <= 1 ? colors.textTertiary : colors.textPrimary} />
            </TouchableOpacity>
            
            <TextInput
              style={[styles.orderInput, errors.lesson_order && styles.inputError]}
              value={formData.lesson_order.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 1;
                setFormData({ ...formData, lesson_order: Math.max(1, num) });
              }}
              keyboardType="numeric"
              textAlign="center"
            />
            
            <TouchableOpacity
              style={styles.orderButton}
              onPress={() => setFormData({ ...formData, lesson_order: formData.lesson_order + 1 })}
            >
              <ChevronUp size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {errors.lesson_order && <Text style={styles.errorText}>{errors.lesson_order}</Text>}
        </View>
        
        {/* Lesson Content */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lesson Content *</Text>
          <TextInput
            style={[styles.textArea, errors.content && styles.inputError]}
            placeholder="Enter the lesson content here..."
            placeholderTextColor={colors.textSecondary}
            value={formData.content}
            onChangeText={(text) => setFormData({ ...formData, content: text })}
            multiline
            numberOfLines={6}
          />
          {errors.content && <Text style={styles.errorText}>{errors.content}</Text>}
        </View>
      </ScrollView>
      
      {/* Action Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Check size={20} color={colors.background} style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>
                {existingLesson ? 'Update Lesson' : 'Create Lesson'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
    height: 150,
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
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
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
    height: '100%',
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
  orderInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  orderInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  orderButton: {
    padding: 8,
  },
  buttonGroup: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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

export default MakeLessonForm;