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
} from 'react-native';
import { X, Check, BookOpen, Hash, FileText } from 'lucide-react-native';
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

// ✅ Simple form data interface
interface LessonFormData {
  title: string;
  content: string;
  lesson_order: number;
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

  // ✅ Simple form state
  const [formData, setFormData] = useState<LessonFormData>({
    title: '',
    content: '',
    lesson_order: 1
  });

  const [errors, setErrors] = useState<Partial<LessonFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [nextOrderNumber, setNextOrderNumber] = useState(1);

  // ✅ Fetch next lesson order automatically
  useEffect(() => {
    const fetchNextOrderNumber = async () => {
      try {
        console.log('🔍 Fetching next lesson order for course:', courseId);
        
        const { data: lessons, error } = await supabase
          .from('lessons')
          .select('lesson_order')
          .eq('course_id', courseId)
          .order('lesson_order', { ascending: false })
          .limit(1);

        if (error) throw error;

        const maxOrder = lessons?.[0]?.lesson_order || 0;
        const nextOrder = maxOrder + 1;
        
        setNextOrderNumber(nextOrder);

        // Auto-set next order for new lessons
        if (!existingLesson) {
          setFormData(prev => ({ ...prev, lesson_order: nextOrder }));
        }

        console.log('📊 Next lesson order:', nextOrder);
      } catch (error) {
        console.error('❌ Error fetching lesson order:', error);
      }
    };

    fetchNextOrderNumber();
  }, [courseId, existingLesson]);

  // ✅ Load existing lesson data
  useEffect(() => {
    if (existingLesson) {
      console.log('✏️ Loading existing lesson:', existingLesson.title);
      setFormData({
        title: existingLesson.title,
        content: existingLesson.content || '',
        lesson_order: existingLesson.lesson_order,
      });
    }
  }, [existingLesson]);

  // ✅ Simple validation
  const validateForm = (): boolean => {
    const newErrors: Partial<LessonFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Please enter a lesson title';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Please enter lesson content';
    }

    if (formData.lesson_order < 1) {
      newErrors.lesson_order = 'Lesson order must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    console.log('🚀 Creating lesson...', formData);

    try {
      // Validate session
      if (!session?.user?.id) {
        throw new Error('Please log in to create lessons');
      }

      // ✅ Check for duplicate lesson orders (only for new lessons)
      if (!existingLesson) {
        const { data: existingLessons, error: checkError } = await supabase
          .from('lessons')
          .select('lesson_order')
          .eq('course_id', courseId)
          .eq('lesson_order', formData.lesson_order);

        if (checkError) throw checkError;

        if (existingLessons && existingLessons.length > 0) {
          Alert.alert(
            'Order Already Exists',
            `Lesson order ${formData.lesson_order} is already taken. Please choose a different order.`,
            [{ text: 'OK' }]
          );
          setIsLoading(false);
          return;
        }
      }

      // ✅ Prepare lesson data - only fields that exist in database
      const lessonData = {
        course_id: courseId,
        title: formData.title.trim(),
        content: formData.content.trim(),
        lesson_order: formData.lesson_order,
        // ✅ Add teacher_id from session for ownership tracking
        teacher_id: session.user.id,
      };

      console.log('📝 Lesson data prepared:', lessonData);

      if (existingLesson) {
        // Update existing lesson
        console.log('🔄 Updating lesson:', existingLesson.id);
        
        const { data, error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', existingLesson.id)
          .select()
          .single();

        if (error) throw error;
        
        console.log('✅ Lesson updated successfully:', data);
        Alert.alert('Success!', 'Lesson updated successfully');
      } else {
        // Create new lesson
        console.log('➕ Creating new lesson...');
        
        const { data, error } = await supabase
          .from('lessons')
          .insert(lessonData)
          .select()
          .single();

        if (error) throw error;
        
        console.log('✅ Lesson created successfully:', data);
        Alert.alert('Success!', 'Lesson created successfully');
      }

      onSuccess();
      
    } catch (error: any) {
      console.error('💥 Error saving lesson:', error);
      
      // ✅ User-friendly error messages
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.code === 'PGRST204') {
        errorMessage = 'Database error. Please contact support.';
      } else if (error.code === '23505') {
        errorMessage = 'This lesson order already exists. Please choose a different number.';
      } else if (error.message?.includes('teacher_id')) {
        errorMessage = 'Unable to verify lesson ownership. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* ✅ Simple Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <BookOpen size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>
              {existingLesson ? 'Edit Lesson' : 'New Lesson'}
            </Text>
            <Text style={styles.subtitle}>
              {existingLesson ? 'Update lesson content' : 'Create engaging content for your students'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* ✅ Lesson Order Badge */}
        <View style={styles.orderBadgeContainer}>
          <View style={styles.orderBadge}>
            <Hash size={16} color={colors.primary} />
            <Text style={styles.orderBadgeText}>Lesson {formData.lesson_order}</Text>
          </View>
          {!existingLesson && (
            <Text style={styles.orderHint}>
              Next available: {nextOrderNumber}
            </Text>
          )}
        </View>

        {/* ✅ Lesson Order Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lesson Order</Text>
          <View style={styles.orderContainer}>
            <TouchableOpacity
              style={[styles.orderButton, formData.lesson_order <= 1 && styles.orderButtonDisabled]}
              onPress={() => setFormData({ ...formData, lesson_order: Math.max(1, formData.lesson_order - 1) })}
              disabled={formData.lesson_order <= 1}
            >
              <Text style={[styles.orderButtonText, formData.lesson_order <= 1 && styles.orderButtonTextDisabled]}>−</Text>
            </TouchableOpacity>
            
            <View style={styles.orderInputContainer}>
              <TextInput
                style={styles.orderInput}
                value={formData.lesson_order.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 1;
                  setFormData({ ...formData, lesson_order: Math.max(1, num) });
                }}
                keyboardType="numeric"
                textAlign="center"
                selectTextOnFocus
              />
            </View>
            
            <TouchableOpacity
              style={styles.orderButton}
              onPress={() => setFormData({ ...formData, lesson_order: formData.lesson_order + 1 })}
            >
              <Text style={styles.orderButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          {errors.lesson_order && <Text style={styles.errorText}>{errors.lesson_order}</Text>}
        </View>
        
        {/* ✅ Lesson Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lesson Title</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="e.g., Introduction to React Native"
            placeholderTextColor={colors.textTertiary}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            maxLength={100}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          <Text style={styles.characterCount}>
            {formData.title.length}/100 characters
          </Text>
        </View>
        
        {/* ✅ Lesson Content */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lesson Content</Text>
          <View style={styles.contentInputContainer}>
            <FileText size={20} color={colors.textTertiary} style={styles.contentIcon} />
            <TextInput
              style={[styles.textArea, errors.content && styles.inputError]}
              placeholder="Write your lesson content here...

You can include:
• Learning objectives
• Step-by-step instructions  
• Examples and explanations
• Practice exercises"
              placeholderTextColor={colors.textTertiary}
              value={formData.content}
              onChangeText={(text) => setFormData({ ...formData, content: text })}
              multiline
              numberOfLines={12}
              textAlignVertical="top"
            />
          </View>
          {errors.content && <Text style={styles.errorText}>{errors.content}</Text>}
        </View>

        {/* ✅ Bottom Spacing */}
        <View style={styles.bottomSpacing} />
        
      </ScrollView>
      
      {/* ✅ Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <Check size={18} color={colors.background} />
              <Text style={styles.submitButtonText}>
                {existingLesson ? 'Update' : 'Create'} Lesson
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
    </View>
  );
};

// ✅ Modern, clean styles
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  orderBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  orderBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary,
  },
  orderHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.textTertiary,
  },
  inputGroup: {
    marginBottom: 24,
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
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginTop: 6,
  },
  characterCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.textTertiary,
    marginTop: 6,
    textAlign: 'right',
  },
  orderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderButtonDisabled: {
    backgroundColor: colors.textTertiary,
    opacity: 0.5,
  },
  orderButtonText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: colors.background,
  },
  orderButtonTextDisabled: {
    color: colors.textTertiary,
  },
  orderInputContainer: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
  },
  orderInput: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  contentInputContainer: {
    position: 'relative',
  },
  contentIcon: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1,
  },
  textArea: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingLeft: 48,
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.textPrimary,
    minHeight: 200,
  },
  bottomSpacing: {
    height: 40,
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.textPrimary,
  },
  submitButton: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.background,
  },
});

export default MakeLessonForm;