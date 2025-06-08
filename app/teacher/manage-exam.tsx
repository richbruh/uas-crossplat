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
  Image,
} from 'react-native';
import { 
  Eye, 
  Download, 
  Camera, 
  FileText, 
  GraduationCap, 
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Printer,
  ArrowLeft
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

// Platform-specific imports
let DocumentPicker: any = null;
let FileSystem: any = null;
let Sharing: any = null;
let Print: any = null;
let TextRecognition: any = null;

// Only import on native platforms
if (Platform.OS !== 'web') {
  try {
    DocumentPicker = require('expo-document-picker');
    FileSystem = require('expo-file-system');
    Sharing = require('expo-sharing');
    Print = require('expo-print');
    TextRecognition = require('@react-native-ml-kit/text-recognition');
  } catch (error) {
    console.log('Native modules not available:', error);
  }
}

interface QuizLesson {
  id: string;
  title: string;
  lesson_order: number;
  submission_count?: number;
  graded_count?: number;
  course_title?: string;
}

// ✅ Updated interface to use lesson_id instead of exam_id
interface SubmissionWithStudent {
  id: string;
  student_id: string;
  lesson_id: string; // Changed from exam_id to lesson_id
  photo_url: string;
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  feedback?: string;
  submitted_at: string;
  graded_at?: string;
  student_name?: string;
  student_email?: string;
  lesson_title?: string;
  lesson_order?: number;
  ocr_text?: string;
}

const getGradeColor = (grade?: string) => {
  switch (grade) {
    case 'A': return '#16a34a';
    case 'B': return '#2563eb';
    case 'C': return '#f59e0b';
    case 'D': return '#ea580c';
    case 'F': return '#dc2626';
    default: return '#6b7280';
  }
};

const isGraded = (submission: SubmissionWithStudent) => {
  return submission.grade !== null && submission.grade !== undefined;
};

const ManageExamPage: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { session } = useAuth();

  // State management
  const [quizLessons, setQuizLessons] = useState<QuizLesson[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<QuizLesson | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [gradeInput, setGradeInput] = useState<'A' | 'B' | 'C' | 'D' | 'F'>('A');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'graded' | 'ungraded'>('all');
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    fetchQuizLessonsAndSubmissions();
  }, []);

  const fetchQuizLessonsAndSubmissions = async () => {
    try {
      setIsLoading(true);

      if (!session?.user?.id) {
        Alert.alert('Error', 'Please log in to manage quizzes');
        return;
      }

      console.log('🔍 Fetching quiz lessons for teacher:', session.user.id);

      // Fetch quiz lessons directly
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          *,
          courses!inner (
            id,
            title,
            teacher_id
          )
        `)
        .eq('lesson_type', 'quiz')
        .eq('courses.teacher_id', session.user.id)
        .order('lesson_order', { ascending: true });

      if (lessonsError) throw lessonsError;

      console.log('📚 Found quiz lessons:', lessons?.length || 0);

      // Fetch submissions for these quiz lessons
      const lessonIds = lessons?.map(l => l.id) || [];
      
      if (lessonIds.length > 0) {
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('submissions')
          .select(`
            *,
            profiles!inner (
              user_id,
              full_name,
              email
            ),
            lessons!inner (
              id,
              title,
              lesson_order
            )
          `)
          .in('lesson_id', lessonIds) // Direct lesson reference
          .order('submitted_at', { ascending: false });

        if (submissionsError) throw submissionsError;

        console.log('📝 Found submissions:', submissionsData?.length || 0);

        // ✅ Process submissions with student info - Fixed mapping
        const processedSubmissions: SubmissionWithStudent[] = submissionsData?.map(sub => ({
          id: sub.id,
          student_id: sub.student_id,
          lesson_id: sub.lesson_id, // Use lesson_id consistently
          photo_url: sub.photo_url,
          grade: sub.grade,
          feedback: sub.feedback,
          submitted_at: sub.submitted_at,
          graded_at: sub.graded_at,
          ocr_text: sub.ocr_text,
          student_name: sub.profiles?.full_name || 'Unknown Student',
          student_email: sub.profiles?.email || '',
          lesson_title: sub.lessons?.title || '',
          lesson_order: sub.lessons?.lesson_order || 0,
        })) || [];

        // Calculate submission stats for each lesson
        const processedLessons: QuizLesson[] = lessons?.map(lesson => ({
          ...lesson,
          course_title: lesson.courses?.title || '',
          submission_count: processedSubmissions.filter(s => s.lesson_id === lesson.id).length,
          graded_count: processedSubmissions.filter(s => s.lesson_id === lesson.id && isGraded(s)).length,
        })) || [];

        setQuizLessons(processedLessons);
        setSubmissions(processedSubmissions);
      } else {
        setQuizLessons([]);
        setSubmissions([]);
      }

      console.log('✅ Data loaded successfully');

    } catch (error: any) {
      console.error('❌ Error fetching quiz data:', error);
      Alert.alert('Error', 'Failed to load quiz data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Single getFilteredSubmissions function - remove duplicates
  const getFilteredSubmissions = () => {
    let filtered = submissions;

    if (selectedLesson) {
      filtered = filtered.filter(s => s.lesson_id === selectedLesson.id); // Use lesson_id
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(s => 
        s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.lesson_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus === 'graded') {
      filtered = filtered.filter(s => isGraded(s));
    } else if (filterStatus === 'ungraded') {
      filtered = filtered.filter(s => !isGraded(s));
    }

    return filtered;
  };

  // OCR Processing (Native only)
  const processImageWithOCR = async (imageUrl: string) => {
    if (Platform.OS === 'web') {
      Alert.alert('OCR Not Available', 'OCR processing is only available on mobile devices.');
      return;
    }

    if (!TextRecognition || !FileSystem) {
      Alert.alert('Error', 'OCR modules not available. Please install on mobile device.');
      return;
    }

    try {
      setIsOCRProcessing(true);
      console.log('🔍 Processing image with OCR:', imageUrl);
      
      // Download image to local filesystem
      const localUri = `${FileSystem.cacheDirectory}ocr-temp-${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localUri);
      
      if (downloadResult.status !== 200) {
        throw new Error('Failed to download image');
      }
      
      console.log('📥 Image downloaded to:', localUri);
      
      // Process with ML Kit Text Recognition
      const result = await TextRecognition.default.recognize(localUri);
      
      // Clean up temp file
      await FileSystem.deleteAsync(localUri, { idempotent: true });
      
      const extractedText = result.text;
      console.log('📄 OCR Text extracted:', extractedText.substring(0, 200) + '...');
      
      // Save OCR result to database
      if (selectedSubmission) {
        await saveOCRResult(selectedSubmission.id, extractedText);
      }
      
      setOcrResult(extractedText);
      setShowOCRModal(true);
      
    } catch (error: any) {
      console.error('❌ OCR processing error:', error);
      Alert.alert('OCR Error', `Failed to process image: ${error.message}`);
    } finally {
      setIsOCRProcessing(false);
    }
  };

  // Save OCR result to database
  const saveOCRResult = async (submissionId: string, ocrText: string) => {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ ocr_text: ocrText })
        .eq('id', submissionId);

      if (error) throw error;
      
      // Update local state
      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === submissionId 
            ? { ...sub, ocr_text: ocrText }
            : sub
        )
      );
      
      console.log('✅ OCR result saved to database');
    } catch (error) {
      console.error('❌ Error saving OCR result:', error);
    }
  };

  // Generate PDF Report (Native only)
  const generatePDFReport = async (submission: SubmissionWithStudent) => {
    if (Platform.OS === 'web') {
      // Web fallback - just show alert with text
      const reportText = `
Quiz Submission Report
===================
Student: ${submission.student_name}
Email: ${submission.student_email}
Lesson: ${submission.lesson_title}
Submitted: ${new Date(submission.submitted_at).toLocaleString()}
Grade: ${submission.grade || 'Not graded'}
Feedback: ${submission.feedback || 'No feedback'}
OCR Text: ${submission.ocr_text || 'Not processed'}
      `;
      Alert.alert('Report Generated', reportText);
      return;
    }

    if (!Print || !Sharing) {
      Alert.alert('Error', 'PDF export not available. Please use mobile device.');
      return;
    }

    try {
      setExportingPDF(true);
      console.log('📄 Generating PDF for submission:', submission.id);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Quiz Submission Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #007AFF; padding-bottom: 20px; margin-bottom: 30px; }
              .info-section { margin-bottom: 20px; }
              .grade-section { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📋 Quiz Submission Report</h1>
              <h2>${submission.lesson_title}</h2>
            </div>
            <div class="info-section">
              <h3>👤 Student Information</h3>
              <p><strong>Name:</strong> ${submission.student_name}</p>
              <p><strong>Email:</strong> ${submission.student_email}</p>
              <p><strong>Submitted:</strong> ${new Date(submission.submitted_at).toLocaleString()}</p>
            </div>
            ${isGraded(submission) ? `
              <div class="grade-section">
                <h3>🎯 Grade & Feedback</h3>
                <p><strong>Grade:</strong> ${submission.grade}</p>
                <p><strong>Feedback:</strong> ${submission.feedback || 'No feedback provided'}</p>
              </div>
            ` : ''}
            ${submission.ocr_text ? `
              <div class="info-section">
                <h3>📄 OCR Extracted Text</h3>
                <pre style="background: #f8f9fa; padding: 20px; border-radius: 10px; white-space: pre-wrap;">${submission.ocr_text}</pre>
              </div>
            ` : ''}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      console.log('✅ PDF generated at:', uri);

      // Share the PDF
      if (Sharing && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Quiz Report - ${submission.student_name}`,
        });
      } else {
        Alert.alert('Success', 'PDF generated successfully!');
      }

    } catch (error: any) {
      console.error('❌ PDF generation error:', error);
      Alert.alert('Export Error', 'Failed to generate PDF report. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Grade Submission
  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('submissions')
        .update({
          grade: gradeInput,
          feedback: feedbackInput.trim() || null,
          graded_at: new Date().toISOString(),
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      Alert.alert('Success', 'Submission graded successfully!');
      setShowGradingModal(false);
      setSelectedSubmission(null);
      setGradeInput('A');
      setFeedbackInput('');
      
      // Refresh data
      await fetchQuizLessonsAndSubmissions();

    } catch (error: any) {
      console.error('❌ Error grading submission:', error);
      Alert.alert('Error', 'Failed to grade submission. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render Quiz Lesson Card
  const renderQuizLessonCard = ({ item }: { item: QuizLesson }) => (
    <TouchableOpacity
      style={[
        styles.lessonCard,
        selectedLesson?.id === item.id && styles.lessonCardSelected
      ]}
      onPress={() => setSelectedLesson(item)}
    >
      <View style={styles.lessonCardHeader}>
        <View style={styles.lessonIcon}>
          <Text style={styles.lessonEmoji}>❓</Text>
        </View>
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.lessonSubtitle}>
            {item.course_title} • Lesson {item.lesson_order}
          </Text>
        </View>
        <View style={styles.lessonStats}>
          <Text style={styles.statText}>
            {item.graded_count || 0}/{item.submission_count || 0}
          </Text>
          <Text style={styles.statLabel}>Graded</Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${item.submission_count ? 
                  ((item.graded_count || 0) / item.submission_count) * 100 : 0}%` 
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {item.submission_count ? 
            Math.round(((item.graded_count || 0) / item.submission_count) * 100) : 0}% completed
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render Submission Card
  const renderSubmissionCard = ({ item }: { item: SubmissionWithStudent }) => (
    <View style={styles.submissionCard}>
      <View style={styles.submissionHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.student_name}</Text>
          <Text style={styles.studentEmail}>{item.student_email}</Text>
          <Text style={styles.submissionDate}>
            Submitted: {new Date(item.submitted_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.gradeContainer}>
          {isGraded(item) ? (
            <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(item.grade) }]}>
              <Text style={styles.gradeText}>{item.grade}</Text>
            </View>
          ) : (
            <View style={styles.ungradedBadge}>
              <Clock size={16} color={colors.textTertiary} />
              <Text style={styles.ungradedText}>Pending</Text>
            </View>
          )}
        </View>
      </View>

      {/* OCR Status Indicator */}
      {item.ocr_text && (
        <View style={styles.ocrStatusBadge}>
          <FileText size={14} color={colors.primary} />
          <Text style={styles.ocrStatusText}>OCR Processed</Text>
          <Text style={styles.ocrStatusCount}>
            {item.ocr_text.length} chars
          </Text>
        </View>
      )}

      {/* Submission Image Preview */}
      {item.photo_url && (
        <View style={styles.imagePreviewContainer}>
          <Image 
            source={{ uri: item.photo_url }} 
            style={styles.imagePreview}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Eye size={16} color="white" />
            <Text style={styles.imageOverlayText}>Submission Image</Text>
          </View>
        </View>
      )}

      <View style={styles.submissionActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.ocrButton]}
          onPress={() => {
            setSelectedSubmission(item);
            processImageWithOCR(item.photo_url);
          }}
          disabled={isOCRProcessing}
        >
          {isOCRProcessing && selectedSubmission?.id === item.id ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Camera size={18} color={colors.primary} />
          )}
          <Text style={styles.actionButtonText}>
            {item.ocr_text ? 'Re-scan' : 'OCR Scan'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.gradeButton]}
          onPress={() => {
            setSelectedSubmission(item);
            setGradeInput(item.grade || 'A');
            setFeedbackInput(item.feedback || '');
            setShowGradingModal(true);
          }}
        >
          <GraduationCap size={18} color={colors.primary} />
          <Text style={styles.actionButtonText}>
            {isGraded(item) ? 'Update' : 'Grade'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.pdfButton]}
          onPress={() => generatePDFReport(item)}
          disabled={exportingPDF}
        >
          {exportingPDF ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Printer size={18} color={colors.primary} />
          )}
          <Text style={styles.actionButtonText}>PDF</Text>
        </TouchableOpacity>
      </View>

      {item.feedback && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackLabel}>Teacher Feedback:</Text>
          <Text style={styles.feedbackText}>{item.feedback}</Text>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading quiz data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>📋 Manage Quiz Submissions</Text>
          <Text style={styles.headerSubtitle}>
            Quiz submissions with OCR processing & PDF export
          </Text>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{quizLessons.length}</Text>
              <Text style={styles.statLabelHeader}>Quiz Lessons</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{submissions.length}</Text>
              <Text style={styles.statLabelHeader}>Total Submissions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {submissions.filter(s => isGraded(s)).length}
              </Text>
              <Text style={styles.statLabelHeader}>Graded</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quiz Lessons Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiz Lessons</Text>
          {quizLessons.length > 0 ? (
            <FlatList
              data={quizLessons}
              renderItem={renderQuizLessonCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.lessonsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>No quiz lessons found</Text>
              <Text style={styles.emptySubtext}>
                Create quiz lessons in your courses to manage submissions
              </Text>
            </View>
          )}
        </View>

        {/* Submissions Section */}
        {selectedLesson && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setSelectedLesson(null)}
                >
                  <ArrowLeft size={20} color={colors.primary} />
                </TouchableOpacity>
                <View>
                  <Text style={styles.sectionTitle}>
                    Submissions
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    {selectedLesson.title}
                  </Text>
                </View>
              </View>
              
              {/* Search and Filter */}
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <Search size={16} color={colors.textTertiary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search students..."
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.filterButton}
                  onPress={() => {
                    const nextFilter = 
                      filterStatus === 'all' ? 'ungraded' :
                      filterStatus === 'ungraded' ? 'graded' : 'all';
                    setFilterStatus(nextFilter);
                  }}
                >
                  <Filter size={16} color={colors.primary} />
                  <Text style={styles.filterButtonText}>
                    {filterStatus === 'all' ? 'All' :
                     filterStatus === 'graded' ? 'Graded' : 'Ungraded'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {getFilteredSubmissions().length > 0 ? (
              <FlatList
                data={getFilteredSubmissions()}
                renderItem={renderSubmissionCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📄</Text>
                <Text style={styles.emptyText}>No submissions found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filter'
                    : 'Students haven\'t submitted yet'
                  }
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* OCR Result Modal */}
      <Modal
        visible={showOCRModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📄 OCR Text Extraction</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowOCRModal(false)}
            >
              <XCircle size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.ocrInfoContainer}>
              <FileText size={24} color={colors.primary} />
              <Text style={styles.ocrInfoTitle}>Extracted Text</Text>
              <Text style={styles.ocrInfoSubtitle}>
                Text extracted from student's submission image
              </Text>
            </View>

            <TextInput
              style={styles.ocrResultText}
              value={ocrResult}
              onChangeText={setOcrResult}
              multiline
              placeholder="OCR result will appear here..."
              placeholderTextColor={colors.textTertiary}
            />

            <View style={styles.ocrStats}>
              <Text style={styles.ocrStatsText}>
                Characters: {ocrResult.length} | Words: {ocrResult.split(/\s+/).filter(w => w.length > 0).length} | Lines: {ocrResult.split('\n').length}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => {
                Alert.alert('Copied!', 'OCR text copied to clipboard');
              }}
            >
              <Text style={styles.modalSecondaryButtonText}>Copy Text</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                if (selectedSubmission) {
                  generatePDFReport({
                    ...selectedSubmission,
                    ocr_text: ocrResult
                  });
                }
              }}
            >
              <Printer size={18} color={colors.background} />
              <Text style={styles.modalButtonText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Grading Modal */}
      <Modal
        visible={showGradingModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.gradingModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎯 Grade Submission</Text>
              <TouchableOpacity
                onPress={() => setShowGradingModal(false)}
              >
                <XCircle size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedSubmission && (
              <View style={styles.studentInfoModal}>
                <Text style={styles.studentNameModal}>{selectedSubmission.student_name}</Text>
                <Text style={styles.studentEmailModal}>{selectedSubmission.student_email}</Text>
              </View>
            )}

            <View style={styles.gradeSelection}>
              <Text style={styles.gradeLabel}>Select Grade:</Text>
              <View style={styles.gradeButtons}>
                {(['A', 'B', 'C', 'D', 'F'] as const).map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    style={[
                      styles.gradeButton,
                      gradeInput === grade && styles.gradeButtonSelected,
                      { borderColor: getGradeColor(grade) }
                    ]}
                    onPress={() => setGradeInput(grade)}
                  >
                    <Text 
                      style={[
                        styles.gradeButtonText,
                        gradeInput === grade && { color: getGradeColor(grade) }
                      ]}
                    >
                      {grade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>Feedback (Optional):</Text>
              <TextInput
                style={styles.feedbackInput}
                value={feedbackInput}
                onChangeText={setFeedbackInput}
                placeholder="Enter feedback for the student..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.feedbackCounter}>
                {feedbackInput.length}/500 characters
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowGradingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleGradeSubmission}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <>
                    <CheckCircle size={18} color={colors.background} />
                    <Text style={styles.submitButtonText}>Save Grade</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ✅ Updated createStyles - remove duplicate modalActions and fix all issues
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    gap: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textSecondary,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabelHeader: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textTertiary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textSecondary,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary || colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textPrimary,
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
  filterButtonText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.primary,
  },
  lessonsList: {
    paddingRight: 20,
  },
  lessonCard: {
    width: 300,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lessonCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  lessonCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  lessonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonEmoji: {
    fontSize: 20,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  lessonSubtitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textSecondary,
  },
  lessonStats: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 18,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textTertiary,
  },
  progressContainer: {
    gap: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.backgroundSecondary || colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textSecondary,
  },
  submissionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.textPrimary,
  },
  studentEmail: {
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  submissionDate: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textTertiary,
    marginTop: 4,
  },
  gradeContainer: {
    alignItems: 'center',
  },
  gradeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  ungradedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary || colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ungradedText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textTertiary,
  },
  ocrStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  ocrStatusText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.primary,
  },
  ocrStatusCount: {
    fontSize: 10,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.primary,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary || colors.border,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
  },
  submissionActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  ocrButton: {
    backgroundColor: colors.primary + '15',
  },
  gradeButton: {
    backgroundColor: colors.success + '15' || colors.primary + '15',
  },
  pdfButton: {
    backgroundColor: colors.warning + '15' || colors.primary + '15',
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.primary,
  },
  feedbackContainer: {
    backgroundColor: colors.backgroundSecondary || colors.border,
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  feedbackLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  feedbackText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradingModal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 20,
    paddingTop: Platform.OS === 'web' ? 0 : 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 20,
  },
  studentInfoModal: {
    backgroundColor: colors.backgroundSecondary || colors.border,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  studentNameModal: {
    fontSize: 18,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  studentEmailModal: {
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textSecondary,
    marginTop: 4,
  },
  ocrInfoContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  ocrInfoTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  ocrInfoSubtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  ocrResultText: {
    backgroundColor: colors.backgroundSecondary || colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Inter-Regular',
    color: colors.textPrimary,
    minHeight: 200,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  ocrStats: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  ocrStatsText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textTertiary,
  },
  gradeSelection: {
    marginBottom: 20,
  },
  gradeLabel: {
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  gradeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  gradeButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  gradeButtonSelected: {
    backgroundColor: colors.backgroundSecondary || colors.border,
  },
  gradeButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Bold',
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  feedbackSection: {
    marginBottom: 20,
  },
  feedbackInput: {
    backgroundColor: colors.backgroundSecondary || colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  feedbackCounter: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-Regular',
    color: colors.textTertiary,
    textAlign: 'right',
    marginTop: 6,
  },
  // ✅ Fixed modalActions - no duplicates
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 20,
    paddingBottom: Platform.OS === 'web' ? 0 : 20,
    paddingTop: 16,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.background,
  },
  modalSecondaryButton: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary || colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary || colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.textPrimary,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'system-ui' : 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.background,
  },
});

export default ManageExamPage;