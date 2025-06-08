import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { 
  Plus,
  BookOpen,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  Filter,
  Play,
  FileText,
  HelpCircle,
  Clipboard,
  GameController2,
  Save,
  X,
  Eye,
  Clock,
  ChevronRight
} from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Lesson, getLessonTypeIcon, getLessonTypeLabel, getLessonDuration } from '../../models/lesson';

interface LessonFormData {
  title: string;
  description: string;
  content: string;
  lesson_type: 'video' | 'text' | 'quiz' | 'assignment' | 'interactive';
  duration: string;
  video_url: string;
}

const initialFormData: LessonFormData = {
  title: '',
  description: '',
  content: '',
  lesson_type: 'text',
  duration: '30',
  video_url: '',
};

const ManageLessonsPage: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get course info from params
  const courseId = params.courseId as string;
  const courseTitle = params.courseTitle as string;

  // State management
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [formData, setFormData] = useState<LessonFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'text' | 'quiz' | 'assignment' | 'interactive'>('all');

  useEffect(() => {
    if (courseId) {
      fetchLessons();
    }
  }, [courseId]);

  // Fetch all lessons for the course
  const fetchLessons = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching lessons for course:', courseId);

      const { data: lessonsData, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('lesson_order', { ascending: true });

      if (error) throw error;

      console.log('📚 Found lessons:', lessonsData?.length || 0);
      setLessons(lessonsData || []);

    } catch (error: any) {
      console.error('❌ Error fetching lessons:', error);
      Alert.alert('Error', 'Failed to load lessons. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new lesson
  const handleCreateLesson = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Please enter a lesson title.');
      return;
    }

    try {
      setIsSaving(true);

      // Calculate next lesson order
      const nextOrder = lessons.length > 0 
        ? Math.max(...lessons.map(l => l.lesson_order)) + 1 
        : 1;

      const lessonData = {
        course_id: courseId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        content: formData.content.trim() || null,
        lesson_type: formData.lesson_type,
        lesson_order: nextOrder,
        duration: parseInt(formData.duration) || 30,
        video_url: formData.video_url.trim() || null,
      };

      console.log('📝 Creating lesson:', lessonData);

      const { data, error } = await supabase
        .from('lessons')
        .insert([lessonData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Lesson created successfully:', data.id);
      Alert.alert('Success', 'Lesson created successfully!');
      
      setShowCreateModal(false);
      setFormData(initialFormData);
      await fetchLessons();

    } catch (error: any) {
      console.error('❌ Error creating lesson:', error);
      Alert.alert('Error', 'Failed to create lesson. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Update existing lesson
  const handleUpdateLesson = async () => {
    if (!editingLesson || !formData.title.trim()) {
      Alert.alert('Validation Error', 'Please enter a lesson title.');
      return;
    }

    try {
      setIsSaving(true);

      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        content: formData.content.trim() || null,
        lesson_type: formData.lesson_type,
        duration: parseInt(formData.duration) || 30,
        video_url: formData.video_url.trim() || null,
        updated_at: new Date().toISOString(),
      };

      console.log('📝 Updating lesson:', editingLesson.id, updateData);

      const { error } = await supabase
        .from('lessons')
        .update(updateData)
        .eq('id', editingLesson.id);

      if (error) throw error;

      console.log('✅ Lesson updated successfully');
      Alert.alert('Success', 'Lesson updated successfully!');
      
      setShowEditModal(false);
      setEditingLesson(null);
      setFormData(initialFormData);
      await fetchLessons();

    } catch (error: any) {
      console.error('❌ Error updating lesson:', error);
      Alert.alert('Error', 'Failed to update lesson. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete lesson
  const handleDeleteLesson = (lesson: Lesson) => {
    Alert.alert(
      'Delete Lesson',
      `Are you sure you want to delete "${lesson.title}"?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              console.log('🗑️ Deleting lesson:', lesson.id);

              const { error } = await supabase
                .from('lessons')
                .delete()
                .eq('id', lesson.id);

              if (error) throw error;

              console.log('✅ Lesson deleted successfully');
              Alert.alert('Success', 'Lesson deleted successfully!');
              await fetchLessons();

            } catch (error: any) {
              console.error('❌ Error deleting lesson:', error);
              Alert.alert('Error', 'Failed to delete lesson. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Reorder lessons
  const handleReorderLesson = async (lessonId: string, newOrder: number) => {
    try {
      console.log('🔄 Reordering lesson:', lessonId, 'to order:', newOrder);

      const { error } = await supabase
        .from('lessons')
        .update({ lesson_order: newOrder })
        .eq('id', lessonId);

      if (error) throw error;

      await fetchLessons();
    } catch (error: any) {
      console.error('❌ Error reordering lesson:', error);
      Alert.alert('Error', 'Failed to reorder lesson.');
    }
  };

  // Open edit modal
  const openEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      description: lesson.description || '',
      content: lesson.content || '',
      lesson_type: lesson.lesson_type || 'text',
      duration: lesson.duration?.toString() || '30',
      video_url: lesson.video_url || '',
    });
    setShowEditModal(true);
  };

  // Filter lessons
  const getFilteredLessons = () => {
    let filtered = lessons;

    if (searchQuery.trim()) {
      filtered = filtered.filter(lesson =>
        lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(lesson => lesson.lesson_type === filterType);
    }

    return filtered;
  };

  // Get lesson type color
  const getLessonTypeColor = (type?: string) => {
    switch (type) {
      case 'video': return colors.primary;
      case 'text': return colors.success || colors.primary;
      case 'quiz': return colors.warning || colors.primary;
      case 'assignment': return colors.error || colors.primary;
      case 'interactive': return colors.info || colors.primary;
      default: return colors.textSecondary;
    }
  };

  // Render lesson card
  const renderLessonCard = ({ item: lesson }: { item: Lesson }) => (
    <View style={styles.lessonCard}>
      <View style={styles.lessonHeader}>
        <View style={styles.lessonOrderBadge}>
          <Text style={styles.lessonOrderText}>{lesson.lesson_order}</Text>
        </View>
        
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonTitle} numberOfLines={2}>
            {lesson.title}
          </Text>
          {lesson.description && (
            <Text style={styles.lessonDescription} numberOfLines={2}>
              {lesson.description}
            </Text>
          )}
          
          <View style={styles.lessonMeta}>
            <View style={[styles.typeBadge, { backgroundColor: getLessonTypeColor(lesson.lesson_type) + '15' }]}>
              <Text style={styles.typeIcon}>{getLessonTypeIcon(lesson.lesson_type)}</Text>
              <Text style={[styles.typeText, { color: getLessonTypeColor(lesson.lesson_type) }]}>
                {getLessonTypeLabel(lesson.lesson_type)}
              </Text>
            </View>
            
            {lesson.duration && (
              <View style={styles.durationBadge}>
                <Clock size={12} color={colors.textTertiary} />
                <Text style={styles.durationText}>
                  {getLessonDuration(lesson)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.lessonActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEditModal(lesson)}
          >
            <Edit size={16} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteLesson(lesson)}
          >
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {lesson.content && (
        <TouchableOpacity 
          style={styles.previewContainer}
          onPress={() => {
            Alert.alert(
              'Lesson Content',
              lesson.content || 'No content available',
              [{ text: 'OK' }]
            );
          }}
        >
          <Eye size={14} color={colors.textTertiary} />
          <Text style={styles.previewText}>Preview content</Text>
          <ChevronRight size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );

  // Render form modal
  const renderFormModal = (isEdit: boolean) => (
    <Modal
      visible={isEdit ? showEditModal : showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => {
              isEdit ? setShowEditModal(false) : setShowCreateModal(false);
              setFormData(initialFormData);
              setEditingLesson(null);
            }}
          >
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>
            {isEdit ? 'Edit Lesson' : 'Create New Lesson'}
          </Text>
          
          <TouchableOpacity
            onPress={isEdit ? handleUpdateLesson : handleCreateLesson}
            disabled={isSaving}
            style={styles.saveButton}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Save size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Lesson Title *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Enter lesson title..."
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Brief description of the lesson..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Lesson Type Picker */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Lesson Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.lesson_type}
                onValueChange={(value) => setFormData({ ...formData, lesson_type: value })}
                style={styles.picker}
              >
                <Picker.Item label="📄 Text/Reading" value="text" />
                <Picker.Item label="🎥 Video" value="video" />
                <Picker.Item label="❓ Quiz" value="quiz" />
                <Picker.Item label="📝 Assignment" value="assignment" />
                <Picker.Item label="🎮 Interactive" value="interactive" />
              </Picker>
            </View>
          </View>

          {/* Duration Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.textInput}
              value={formData.duration}
              onChangeText={(text) => setFormData({ ...formData, duration: text.replace(/[^0-9]/g, '') })}
              placeholder="30"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
          </View>

          {/* Video URL (if video type) */}
          {formData.lesson_type === 'video' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Video URL</Text>
              <TextInput
                style={styles.textInput}
                value={formData.video_url}
                onChangeText={(text) => setFormData({ ...formData, video_url: text })}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Content Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Lesson Content</Text>
            <TextInput
              style={[styles.textInput, styles.contentArea]}
              value={formData.content}
              onChangeText={(text) => setFormData({ ...formData, content: text })}
              placeholder="Enter the full lesson content, materials, instructions..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading lessons...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Manage Lessons</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {courseTitle}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={24} color={colors.background} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{lessons.length}</Text>
            <Text style={styles.statLabel}>Total Lessons</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {lessons.filter(l => l.lesson_type === 'quiz').length}
            </Text>
            <Text style={styles.statLabel}>Quizzes</Text>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={16} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search lessons..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              const types = ['all', 'video', 'text', 'quiz', 'assignment', 'interactive'] as const;
              const currentIndex = types.indexOf(filterType);
              const nextType = types[(currentIndex + 1) % types.length];
              setFilterType(nextType);
            }}
          >
            <Filter size={16} color={colors.primary} />
            <Text style={styles.filterText}>
              {filterType === 'all' ? 'All' : getLessonTypeLabel(filterType)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lessons List */}
      <View style={styles.content}>
        {getFilteredLessons().length > 0 ? (
          <FlatList
            data={getFilteredLessons()}
            renderItem={renderLessonCard}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <BookOpen size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {searchQuery || filterType !== 'all' ? 'No lessons found' : 'No lessons yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Create your first lesson to get started'
              }
            </Text>
            {!searchQuery && filterType === 'all' && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Plus size={20} color={colors.background} />
                <Text style={styles.emptyButtonText}>Create Lesson</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Create Modal */}
      {renderFormModal(false)}

      {/* Edit Modal */}
      {renderFormModal(true)}
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
  },
  header: {
    backgroundColor: colors.card,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary || colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
  },
  lessonCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  lessonOrderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonOrderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.background,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
  },
  lessonDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeIcon: {
    fontSize: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
  },
  lessonActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: colors.primary + '15',
  },
  deleteButton: {
    backgroundColor: colors.error + '15',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  previewText: {
    flex: 1,
    fontSize: 14,
    color: colors.textTertiary,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
  },
  saveButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  contentArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: {
    color: colors.textPrimary,
    backgroundColor: colors.card,
  },
});

export default ManageLessonsPage;