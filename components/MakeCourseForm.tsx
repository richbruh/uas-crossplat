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
import { useTheme } from '../app/context/ThemeContext'; // Pastikan path ini benar
import { useAuth } from '../app/context/AuthContext';   // Pastikan path ini benar
import { supabase } from '@/app/utils/supabase';      // Pastikan path ini benar
import { Course } from '@/models/course';  


export interface MakeCourseFormProps {
  initialCourseData?: Course | null; // Untuk mode edit
  onSuccess?: (course: Course) => void;
  onCancel?: () => void;
}

interface CourseFormData {
  title: string;
  grade_level: number;
  description: string;
  thumbnail_url: string | null;
  //total_lessons: number;
}


interface FormErrors {
  title?: string;
  grade_level?: string;
  description?: string;
  //total_lessons?: string;
  thumbnail_url?: string;
}

const GRADE_LEVELS = [1, 2, 3, 4, 5, 6]; // Lebih lengkap

export default function MakeCourseForm({
  initialCourseData,
  onSuccess,
  onCancel
}: MakeCourseFormProps) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false); // Untuk loading upload gambar jika diimplementasikan

  const isEditMode = !!initialCourseData;

  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    grade_level: GRADE_LEVELS[0],
    description: '',
    thumbnail_url: null,
    // ❌ REMOVED: total_lessons: 1
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const styles = getStyles(colors);

  useEffect(() => {
    if (isEditMode && initialCourseData) {
      setFormData({
        title: initialCourseData.title || '',
        grade_level: initialCourseData.grade_level || GRADE_LEVELS[0],
        description: initialCourseData.description || '',
        thumbnail_url: initialCourseData.thumbnail_url || null,
        // ❌ REMOVED: total_lessons: initialCourseData.total_lessons || 1,
      });
    } else {
      // Reset form untuk mode create
      setFormData({
        title: '',
        grade_level: GRADE_LEVELS[0],
        description: '',
        thumbnail_url: null,
        // ❌ REMOVED: total_lessons: 1,
      });
    }
  }, [initialCourseData, isEditMode]);


  const handleInputChange = (name: keyof CourseFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
  const newErrors: FormErrors = {};

  if (!formData.title.trim()) {
    newErrors.title = 'Judul course tidak boleh kosong';
  } else if (formData.title.length < 3) {
    newErrors.title = 'Judul course minimal 3 karakter';
  }

  if (!formData.description.trim()) {
    newErrors.description = 'Deskripsi course tidak boleh kosong';
  } else if (formData.description.length < 10) {
    newErrors.description = 'Deskripsi minimal 10 karakter';
  }

  // ❌ REMOVED: total_lessons validation

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  const selectImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Izin Diperlukan', 'Izin untuk mengakses galeri dibutuhkan!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7, // Kualitas bisa disesuaikan
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        // Di sini Anda bisa langsung upload ke Supabase Storage jika mau
        // Untuk sekarang, kita simpan URI lokalnya dulu
        setImageLoading(true); // Anggap saja ada proses loading
        // Simulasi upload atau proses
        // const uploadedUrl = await uploadImageToSupabase(asset.uri); // Fungsi ini perlu dibuat
        // handleInputChange('thumbnail_url', uploadedUrl);
        handleInputChange('thumbnail_url', asset.uri); // Sementara pakai URI lokal
        setImageLoading(false);
      }
    } catch (error: any) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Gagal memilih gambar. Silakan coba lagi.');
      setImageLoading(false);
    }
  };

const handleSubmit = async () => {
  if (!session?.user) {
    Alert.alert('Error', 'Anda harus login untuk melanjutkan');
    return;
  }

  if (!validateForm()) {
    return;
  }

  setLoading(true);
  try {
    // ✅ UPDATED: Remove total_lessons from payload, will be auto-calculated
    const coursePayload = {
      title: formData.title.trim(),
      grade_level: formData.grade_level,
      description: formData.description.trim(),
      thumbnail_url: formData.thumbnail_url,
      teacher_id: session.user.id,
      // ❌ REMOVED: total_lessons: formData.total_lessons,
      // ✅ NEW: Set default total_lessons as 0, will be updated when lessons are added
      total_lessons: 0,
    };

    let resultCourse: Course | null = null;

    if (isEditMode && initialCourseData?.id) {
      // ✅ UPDATED: For edit mode, don't update total_lessons (preserve current count)
      const { total_lessons, ...updatePayload } = coursePayload;
      
      const { data, error } = await supabase
        .from('courses')
        .update(updatePayload) // Don't update total_lessons in edit mode
        .eq('id', initialCourseData.id)
        .select()
        .single();
      if (error) throw error;
      resultCourse = data as Course;
      Alert.alert('Sukses', 'Course berhasil diperbarui!');
    } else {
      // Create new course with total_lessons = 0
      const { data, error } = await supabase
        .from('courses')
        .insert([coursePayload])
        .select()
        .single();
      if (error) throw error;
      resultCourse = data as Course;
      Alert.alert('Sukses', 'Course berhasil dibuat! Anda dapat menambahkan lesson sekarang.');
    }

    if (onSuccess && resultCourse) {
      onSuccess(resultCourse);
    }

    // Reset form untuk create mode
    if (!isEditMode) {
      setFormData({
        title: '',
        grade_level: GRADE_LEVELS[0],
        description: '',
        thumbnail_url: null,
        // ❌ REMOVED: total_lessons: 1,
      });
      setErrors({});
    }

  } catch (error: any) {
    console.error(`Error ${isEditMode ? 'updating' : 'creating'} course:`, error);
    Alert.alert('Error', error.message || `Gagal ${isEditMode ? 'memperbarui' : 'membuat'} course`);
  } finally {
    setLoading(false);
  }
};

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>{isEditMode ? 'Edit Course' : 'Buat Course Baru'}</Text>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Course Title */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Judul Course *</Text>
        <TextInput
          style={[styles.textInput, errors.title ? styles.inputError : null]}
          placeholder="Masukkan judul course"
          placeholderTextColor={colors.textSecondary}
          value={formData.title}
          onChangeText={(text) => handleInputChange('title', text)}
          maxLength={100}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
      </View>

      {/* Grade Level */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tingkat Kelas *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.grade_level}
            onValueChange={(value: number) => handleInputChange('grade_level', value)}
            style={styles.picker}
            itemStyle={Platform.OS === 'ios' ? { color: colors.textPrimary } : {}} // itemStyle untuk iOS
            dropdownIconColor={colors.textSecondary}
          >
            {GRADE_LEVELS.map(level => (
              <Picker.Item
                key={level}
                label={`Kelas ${level}`}
                value={level}
                color={Platform.OS === 'android' ? colors.textPrimary : undefined} // color prop untuk Android
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Deskripsi *</Text>
        <TextInput
          style={[styles.textAreaInput, errors.description ? styles.inputError : null]}
          placeholder="Masukkan deskripsi course"
          placeholderTextColor={colors.textSecondary}
          value={formData.description}
          onChangeText={(text) => handleInputChange('description', text)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
        />
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        <Text style={styles.characterCount}>
          {formData.description.length}/500 karakter
        </Text>
      </View>

      {/* Thumbnail Image */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Thumbnail Course</Text>
        {formData.thumbnail_url ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: formData.thumbnail_url }} style={styles.thumbnailImage} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => handleInputChange('thumbnail_url', null)}
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
                <Text style={styles.imageUploadText}>Tambah Thumbnail</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {errors.thumbnail_url && <Text style={styles.errorText}>{errors.thumbnail_url}</Text>}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={loading || imageLoading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>{isEditMode ? 'Update Course' : 'Buat Course'}</Text>
          )}
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity
            style={[styles.button, styles.cancelButtonBottom]}
            onPress={onCancel}
            disabled={loading || imageLoading}
          >
            <Text style={styles.cancelButtonText}>Batal</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

// Pastikan path ke Colors.ts benar
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
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 12 : 16, // Sedikit perbedaan padding untuk iOS
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontFamily: 'Inter-Bold',
      fontSize: 22, // Sedikit lebih kecil agar pas
      color: colors.textPrimary,
    },
    cancelButton: {
      padding: 8, // Area sentuh yang cukup
    },
    inputGroup: {
      marginBottom: 20, // Jarak antar grup input
      paddingHorizontal: 16,
    },
    label: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 15, // Sedikit lebih kecil
      color: colors.textPrimary,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10, // Sedikit lebih bulat
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 14 : 12, // Penyesuaian padding vertikal
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.card, // Warna latar input
    },
    textAreaInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 16,
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.card,
      minHeight: 100, // Tinggi minimal untuk text area
      textAlignVertical: 'top', // Mulai teks dari atas
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.card,
      overflow: 'hidden', // Untuk memastikan border radius bekerja
    },
    picker: {
      height: Platform.OS === 'ios' ? undefined : 50, // Di iOS, tinggi diatur oleh itemStyle
      color: colors.textPrimary,
      paddingHorizontal: Platform.OS === 'android' ? 8 : 0, // Padding untuk Android
    },
    inputError: {
      borderColor: colors.error, // Warna border saat error
    },
    errorText: {
      fontFamily: 'Inter-Medium',
      fontSize: 13, // Sedikit lebih kecil
      color: colors.error,
      marginTop: 6, // Jarak dari input
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
      alignSelf: 'flex-start', // Agar tidak memenuhi lebar
      marginTop: 8,
    },
    thumbnailImage: {
      width: Platform.OS === 'web' ? 250 : 200, // Ukuran berbeda untuk web
      height: Platform.OS === 'web' ? 140 : 112,
      borderRadius: 10,
      resizeMode: 'cover',
      backgroundColor: colors.border, // Placeholder color
    },
    removeImageButton: {
      position: 'absolute',
      top: -8, // Sedikit keluar dari gambar
      right: -8,
      backgroundColor: colors.error, // Warna tombol hapus
      borderRadius: 15, // Bulat
      padding: 6, // Padding dalam tombol
      elevation: 2, // Shadow untuk Android
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
    },
    imageUploadButton: {
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: 10,
      paddingVertical: 30, // Padding vertikal lebih besar
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSecondary, // Warna latar tombol upload
      marginTop: 8,
    },
    imageUploadText: {
      fontFamily: 'Inter-Medium',
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 10, // Jarak dari ikon
    },
    buttonContainer: {
      paddingHorizontal: 16,
      paddingTop: 24, // Jarak dari elemen terakhir
      paddingBottom: Platform.OS === 'ios' ? 40 : 32, // Padding bawah lebih besar untuk iOS (home indicator)
    },
    button: {
      borderRadius: 10,
      paddingVertical: 15, // Padding vertikal tombol
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12, // Jarak antar tombol jika ada cancel
    },
    submitButton: {
      backgroundColor: colors.primary, // Warna tombol submit
    },
    submitButtonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.background, // Warna teks tombol submit
    },
    cancelButtonBottom: {
      backgroundColor: 'transparent', // Tombol cancel transparan
      borderWidth: 1,
      borderColor: colors.border, // Border untuk tombol cancel
    },
    cancelButtonText: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: colors.textSecondary, // Warna teks tombol cancel
    },
  });