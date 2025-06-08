/**
 * Represents a student's submission for a quiz lesson
 */
export interface Submission {
  id: string; // UUID
  student_id: string; // UUID reference to profiles.user_id
  lesson_id: string; // UUID reference to lessons.id (for quiz lessons)
  photo_url: string; // TEXT NOT NULL
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | null; // TEXT with CHECK constraint
  feedback: string | null; // TEXT
  ocr_text?: string | null; // TEXT for OCR processing
  submitted_at: string; // TIMESTAMPTZ
  graded_at: string | null; // TIMESTAMPTZ
}

/**
 * Extended submission interface with lesson and student details
 */
export interface SubmissionWithDetails extends Submission {
  lesson?: {
    id: string;
    title: string;
    lesson_type: string;
    lesson_order: number;
    course_id: string;
    content: string;
    duration: number;
  };
  student?: {
    user_id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  course?: {
    id: string;
    title: string;
    teacher_id: string;
  };
}

export function getGradeColor(grade: string | null): string {
  if (!grade) return '#757575'; // Grey for ungraded
  switch (grade) {
    case 'A': return '#4caf50'; // Green
    case 'B': return '#8bc34a'; // Light green
    case 'C': return '#ffc107'; // Yellow
    case 'D': return '#ff9800'; // Orange
    case 'F': return '#f44336'; // Red
    default: return '#757575'; // Grey for unknown
  }
}

export function isGraded(submission: Submission): boolean {
  return submission.grade !== null && submission.graded_at !== null;
}

/**
 * Get grade display text with emoji
 */
export function getGradeDisplay(grade: string | null): string {
  if (!grade) return '⏳ Pending Review';
  switch (grade) {
    case 'A': return '🏆 A - Excellent';
    case 'B': return '🥈 B - Good';
    case 'C': return '🥉 C - Average';
    case 'D': return '📝 D - Below Average';
    case 'F': return '❌ F - Failed';
    default: return '❓ Unknown Grade';
  }
}

/**
 * Get grade points for GPA calculation
 */
export function getGradePoints(grade: string | null): number {
  switch (grade) {
    case 'A': return 4.0;
    case 'B': return 3.0;
    case 'C': return 2.0;
    case 'D': return 1.0;
    case 'F': return 0.0;
    default: return 0.0;
  }
}

/**
 * Calculate submission statistics
 */
export function getSubmissionStats(submissions: Submission[]) {
  const total = submissions.length;
  const graded = submissions.filter(s => isGraded(s)).length;
  const pending = total - graded;
  
  const gradeDistribution = {
    A: submissions.filter(s => s.grade === 'A').length,
    B: submissions.filter(s => s.grade === 'B').length,
    C: submissions.filter(s => s.grade === 'C').length,
    D: submissions.filter(s => s.grade === 'D').length,
    F: submissions.filter(s => s.grade === 'F').length,
  };

  // Calculate average grade
  const gradedSubmissions = submissions.filter(s => isGraded(s));
  const totalPoints = gradedSubmissions.reduce((sum, s) => sum + getGradePoints(s.grade), 0);
  const averageGPA = gradedSubmissions.length > 0 ? totalPoints / gradedSubmissions.length : 0;

  return {
    total,
    graded,
    pending,
    gradingProgress: total > 0 ? Math.round((graded / total) * 100) : 0,
    gradeDistribution,
    averageGPA: Math.round(averageGPA * 100) / 100, // Round to 2 decimal places
  };
}

/**
 * Get submission status with color and icon
 */
export function getSubmissionStatus(submission: Submission) {
  if (isGraded(submission)) {
    return {
      status: 'graded',
      label: `Graded - ${getGradeDisplay(submission.grade)}`,
      color: getGradeColor(submission.grade),
      icon: '✅',
    };
  } else {
    return {
      status: 'pending',
      label: 'Pending Review',
      color: '#ff9800',
      icon: '⏳',
    };
  }
}

/**
 * Format submission date for display
 */
export function formatSubmissionDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

/**
 * Validate submission data
 */
export function validateSubmission(submission: Partial<Submission>): string[] {
  const errors: string[] = [];

  if (!submission.student_id) {
    errors.push('Student ID is required');
  }

  if (!submission.lesson_id) {
    errors.push('Lesson ID is required');
  }

  if (!submission.photo_url) {
    errors.push('Photo URL is required');
  }

  if (submission.grade && !['A', 'B', 'C', 'D', 'F'].includes(submission.grade)) {
    errors.push('Invalid grade value');
  }

  return errors;
}

/**
 * Create submission payload for database insert
 */
export function createSubmissionPayload(data: {
  student_id: string;
  lesson_id: string;
  photo_url: string;
}): Partial<Submission> {
  return {
    student_id: data.student_id,
    lesson_id: data.lesson_id,
    photo_url: data.photo_url,
    submitted_at: new Date().toISOString(),
  };
}

/**
 * Check if lesson supports submissions (quiz type)
 */
export function isQuizLesson(lesson: { lesson_type?: string }): boolean {
  return lesson.lesson_type === 'quiz';
}