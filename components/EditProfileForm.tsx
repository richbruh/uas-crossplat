import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, User, Save } from 'lucide-react-native';
import { supabase } from '@/app/utils/supabase';
import { profile } from '@/models/profile';

interface EditProfileFormProps {
  visible: boolean;
  profile: profile | null;
  onClose: () => void;
  onSuccess: (updatedProfile: profile) => void;
  colors: any;
}

export default function EditProfileForm({ 
  visible, 
  profile, 
  onClose, 
  onSuccess, 
  colors 
}: EditProfileFormProps) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string }>({});

  // Reset form when modal opens
  React.useEffect(() => {
    if (visible && profile) {
      setFullName(profile.full_name || '');
      setErrors({});
    }
  }, [visible, profile]);

  // Validation
  const validateForm = () => {
    const newErrors: { fullName?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    } else if (fullName.trim().length > 50) {
      newErrors.fullName = 'Full name must be less than 50 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(fullName.trim())) {
      newErrors.fullName = 'Full name can only contain letters and spaces';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
// Replace the handleSave function
const handleSave = async () => {
  if (!validateForm()) return;
  if (!profile?.user_id) {
    Alert.alert('Error', 'Profile information not available');
    return;
  }

  try {
    setLoading(true);

    // ✅ FIXED: Update profile in Supabase (removed updated_at)
    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: fullName.trim()
        // ❌ REMOVED: updated_at: new Date().toISOString()
      })
      .eq('user_id', profile.user_id);

    if (error) throw error;

    // Create updated profile object
    const updatedProfile: profile = {
      ...profile,
      full_name: fullName.trim(),
    };

    // Call success callback
    onSuccess(updatedProfile);
    
    // Show success message
    Alert.alert('Success', 'Profile updated successfully!');
    
    // Close modal
    onClose();

  } catch (error: any) {
    console.error('Error updating profile:', error);
    Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
  } finally {
    setLoading(false);
  }
};

  // Handle cancel
  const handleCancel = () => {
    if (fullName !== profile?.full_name) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <User size={20} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Edit Profile
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleCancel}
              style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                Full Name *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    color: colors.textPrimary,
                    borderColor: errors.fullName ? colors.error : colors.border,
                  },
                ]}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textSecondary}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName) {
                    setErrors(prev => ({ ...prev, fullName: undefined }));
                  }
                }}
                editable={!loading}
                maxLength={50}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {errors.fullName && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.fullName}
                </Text>
              )}
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                {fullName.length}/50 characters
              </Text>
            </View>

            {/* Current Profile Info */}
            <View style={[styles.infoBox, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Current Information:
              </Text>
              <Text style={[styles.infoText, { color: colors.textPrimary }]}>
                Name: {profile?.full_name || 'Not set'}
              </Text>
              <Text style={[styles.infoText, { color: colors.textPrimary }]}>
                Role: {profile?.role || 'Unknown'}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: colors.border }
              ]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                { 
                  backgroundColor: colors.primary,
                  opacity: loading ? 0.7 : 1 
                }
              ]}
              onPress={handleSave}
              disabled={loading || !fullName.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <Save size={16} color={colors.background} />
                  <Text style={[styles.saveButtonText, { color: colors.background }]}>
                    Save Changes
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginTop: 4,
  },
  helperText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  saveButton: {
    // backgroundColor set dynamically
  },
  saveButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
});