/**
 * Represents a student's submission for an exam
 */
export interface Submission {
  id: string; // UUID
  student_id: string; // UUID reference to profiles.user_id
  exam_id: string; // UUID reference to exams.id
  photo_url: string; // TEXT NOT NULL
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | null; // TEXT with CHECK constraint
  feedback: string | null; // TEXT
  submitted_at: string; // TIMESTAMPTZ
  graded_at: string | null; // TIMESTAMPTZ
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