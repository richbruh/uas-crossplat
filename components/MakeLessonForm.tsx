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
import { Picker } from '@react-native-picker/picker';
import { X, Check, BookOpen, Hash, FileText, Type, Clock, Video } from 'lucide-react-native';
import { useTheme } from '../app/context/ThemeContext';
import { useAuth } from '../app/context/AuthContext';
import { supabase } from '@/app/utils/supabase';
import { Lesson, getLessonTypeIcon, getLessonTypeLabel } from '@/models/lesson';

interface MakeLessonFormProps {
  courseId: string;
  onSuccess: () => void;
  onCancel: () => void;
  existingLesson?: Lesson;
}

// ✅ Complete form data interface sesuai dengan Lesson.ts
interface LessonFormData {
  title: string;
  description: string;
  content: string;
  lesson_type: 'video' | 'text' | 'quiz' | 'assignment' | 'interactive';
  duration: number | null;
  video_url: string;
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

  // ✅ Complete form state with all lesson fields
  const [formData, setFormData] = useState<LessonFormData>({
    title: '',
    description: '',
    content: '',
    lesson_type: 'text', // Default to text
    duration: null,
    video_url: '',
  });

  const [errors, setErrors] = useState<Partial<LessonFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [nextOrderNumber, setNextOrderNumber] = useState(1);

  // ✅ Fetch next lesson order automatically (for display only)
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
        console.log('📊 Next lesson order will be:', nextOrder);
      } catch (error) {
        console.error('❌ Error fetching lesson order:', error);
      }
    };

    // Only fetch for new lessons (not for editing)
    if (!existingLesson) {
      fetchNextOrderNumber();
    }
  }, [courseId, existingLesson]);

  // ✅ Load existing lesson data with all fields
  useEffect(() => {
    if (existingLesson) {
      console.log('✏️ Loading existing lesson:', existingLesson.title);
      setFormData({
        title: existingLesson.title,
        description: existingLesson.description || '',
        content: existingLesson.content || '',
        lesson_type: existingLesson.lesson_type || 'text',
        duration: existingLesson.duration || null,
        video_url: existingLesson.video_url || '',
      });
    }
  }, [existingLesson]);

  // ✅ Enhanced validation with all fields
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

  // Validate video URL for video lessons
  if (formData.lesson_type === 'video' && formData.video_url.trim()) {
    try {
      new URL(formData.video_url);
    } catch {
      newErrors.video_url = 'Please enter a valid video URL';
    }
  }

  // ✅ Fix duration validation - check for number type properly
  if (formData.duration !== null && (formData.duration < 1 || formData.duration > 300)) {
    newErrors.duration = 'Duration must be between 1 and 300 minutes';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  // ✅ Handle form submission with complete lesson data
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    console.log('🚀 Creating lesson...', formData);

    try {
      // Validate session
      if (!session?.user?.id) {
        throw new Error('Please log in to create lessons');
      }

      if (existingLesson) {
        // ✅ Update existing lesson with all fields
        const lessonData = {
          course_id: courseId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          content: formData.content.trim(),
          lesson_type: formData.lesson_type,
          duration: formData.duration,
          video_url: formData.video_url.trim() || null,
        };

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
        // ✅ Create new lesson with auto-calculated lesson_order
        console.log('📊 Calculating lesson order...');
        
        // Get the current max order
        const { data: lessons, error: orderError } = await supabase
          .from('lessons')
          .select('lesson_order')
          .eq('course_id', courseId)
          .order('lesson_order', { ascending: false })
          .limit(1);

        if (orderError) throw orderError;

        const maxOrder = lessons?.[0]?.lesson_order || 0;
        const newLessonOrder = maxOrder + 1;

        console.log('📊 Auto-assigned lesson order:', newLessonOrder);

        const lessonData = {
          course_id: courseId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          content: formData.content.trim(),
          lesson_type: formData.lesson_type,
          lesson_order: newLessonOrder, // ✅ Auto-calculated
          duration: formData.duration,
          video_url: formData.video_url.trim() || null,
        };

        console.log('➕ Creating new lesson...');
        
        const { data, error } = await supabase
          .from('lessons')
          .insert(lessonData)
          .select()
          .single();

        if (error) throw error;
        
        console.log('✅ Lesson created successfully:', data);
        Alert.alert('Success!', `${getLessonTypeLabel(formData.lesson_type)} lesson created as #${newLessonOrder}`);
      }

      onSuccess();
      
    } catch (error: any) {
      console.error('💥 Error saving lesson:', error);
      
      // ✅ User-friendly error messages
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.code === '42501') {
        errorMessage = 'Permission denied. You can only manage lessons for your own courses.';
      } else if (error.code === 'PGRST204') {
        errorMessage = 'Database schema error. Please contact support.';
      } else if (error.message?.includes('teacher_id')) {
        errorMessage = 'Database configuration issue. Please try again.';
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
      
      {/* ✅ Header with lesson type info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconEmoji}>
              {getLessonTypeIcon(formData.lesson_type)}
            </Text>
          </View>
          <View>
            <Text style={styles.title}>
              {existingLesson ? 'Edit Lesson' : 'New Lesson'}
            </Text>
            <Text style={styles.subtitle}>
              {existingLesson 
                ? `${getLessonTypeLabel(existingLesson.lesson_type)} - Lesson #${existingLesson.lesson_order}` 
                : `${getLessonTypeLabel(formData.lesson_type)} - Lesson #${nextOrderNumber}`
              }
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* ✅ Lesson Number Display (read-only) */}
        <View style={styles.orderBadgeContainer}>
          <View style={styles.orderBadge}>
            <Hash size={16} color={colors.primary} />
            <Text style={styles.orderBadgeText}>
              {existingLesson 
                ? `Lesson ${existingLesson.lesson_order}` 
                : `Next: Lesson ${nextOrderNumber}`
              }
            </Text>
          </View>
          <Text style={styles.orderHint}>
            {existingLesson 
              ? 'Lesson order cannot be changed' 
              : 'Order assigned automatically'
            }
          </Text>
        </View>

        {/* ✅ Lesson Type Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lesson Type</Text>
          <View style={styles.pickerContainer}>
            <Type size={20} color={colors.textTertiary} style={styles.pickerIcon} />
            <Picker
              selectedValue={formData.lesson_type}
              onValueChange={(value) => {
                setFormData({ ...formData, lesson_type: value });
                // Clear video URL if not video type
                if (value !== 'video') {
                  setFormData(prev => ({ ...prev, lesson_type: value, video_url: '' }));
                }
              }}
              style={styles.picker}
              dropdownIconColor={colors.textPrimary}
            >
              <Picker.Item 
                label={`${getLessonTypeIcon('text')} ${getLessonTypeLabel('text')} - Reading material`} 
                value="text" 
              />
              <Picker.Item 
                label={`${getLessonTypeIcon('video')} ${getLessonTypeLabel('video')} - Video content`} 
                value="video" 
              />
              <Picker.Item 
                label={`${getLessonTypeIcon('quiz')} ${getLessonTypeLabel('quiz')} - Assessment`} 
                value="quiz" 
              />
              <Picker.Item 
                label={`${getLessonTypeIcon('assignment')} ${getLessonTypeLabel('assignment')} - Task/Project`} 
                value="assignment" 
              />
              <Picker.Item 
                label={`${getLessonTypeIcon('interactive')} ${getLessonTypeLabel('interactive')} - Interactive content`} 
                value="interactive" 
              />
            </Picker>
          </View>
          <Text style={styles.helperText}>
            Choose the type of content for this lesson
          </Text>
        </View>
        
        {/* ✅ Lesson Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lesson Title</Text>
          <TextInput
            style={[
              styles.input, 
              errors.title ? styles.inputError : null // ✅ Fix conditional style
            ]}
            placeholder={`e.g., Introduction to ${getLessonTypeLabel(formData.lesson_type)}`}
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

        {/* ✅ Lesson Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder={`Brief description of this ${formData.lesson_type} lesson`}
            placeholderTextColor={colors.textTertiary}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            maxLength={200}
            multiline
            numberOfLines={2}
          />
          <Text style={styles.characterCount}>
            {formData.description.length}/200 characters
          </Text>
        </View>

        {/* ✅ Video URL (only for video lessons) */}
        {formData.lesson_type === 'video' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Video URL</Text>
            <View style={styles.inputWithIcon}>
              <Video size={20} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[
                  styles.inputWithIconText, 
                  errors.video_url ? styles.inputError : null // ✅ Fix conditional style
                ]}
                placeholder="https://youtube.com/watch?v=... or direct video URL"
                placeholderTextColor={colors.textTertiary}
                value={formData.video_url}
                onChangeText={(text) => setFormData({ ...formData, video_url: text })}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
            {errors.video_url && <Text style={styles.errorText}>{errors.video_url}</Text>}
            <Text style={styles.helperText}>
              Enter YouTube, Vimeo, or direct video URL
            </Text>
          </View>
        )}

        {/* ✅ Duration (for all lesson types) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Duration (minutes)</Text>
          <View style={styles.inputWithIcon}>
            <Clock size={20} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={[
                styles.inputWithIconText, 
                errors.duration ? styles.inputError : null // ✅ Fix conditional style
              ]}
              placeholder={`e.g., ${formData.lesson_type === 'video' ? '15' : formData.lesson_type === 'quiz' ? '10' : '20'}`}
              placeholderTextColor={colors.textTertiary}
              value={formData.duration?.toString() || ''}
              onChangeText={(text) => {
                const num = parseInt(text) || null;
                setFormData({ ...formData, duration: num });
              }}
              keyboardType="numeric"
            />
          </View>
          {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}
          <Text style={styles.helperText}>
            Estimated time to complete this lesson
          </Text>
        </View>
        {/* ✅ Lesson Content */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lesson Content</Text>
          <View style={styles.contentInputContainer}>
            <FileText size={20} color={colors.textTertiary} style={styles.contentIcon} />
            <TextInput
              style={[styles.textArea, errors.content && styles.inputError]}
              placeholder={`Write your ${formData.lesson_type} content here...

${formData.lesson_type === 'video' ? `You can include:
• Video description and overview
• Key points covered in the video
• Additional notes or resources
• Discussion questions` : 
formData.lesson_type === 'quiz' ? `You can include:
• Quiz instructions
• Question format explanation
• Grading criteria
• Time limits` :
formData.lesson_type === 'assignment' ? `You can include:
• Assignment instructions
• Submission requirements
• Grading rubric
• Due date information` :
`You can include:
• Learning objectives
• Step-by-step instructions
• Examples and explanations
• Practice exercises`}`}
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
                {existingLesson ? 'Update' : 'Create'} {getLessonTypeLabel(formData.lesson_type)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
    </View>
  );
};

// ✅ Enhanced styles with lesson type components
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
  iconEmoji: {
    fontSize: 20,
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
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.textTertiary,
    marginTop: 6,
  },
  pickerContainer: {
    position: 'relative',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingLeft: 48,
    height: 52,
  },
  pickerIcon: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1,
  },
  picker: {
    color: colors.textPrimary,
    height: '100%',
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1,
  },
  inputWithIconText: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingLeft: 48,
    paddingRight: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.textPrimary,
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