/**
 * Represents an exam for a course
 */
export interface Exam {
  id: string; // UUID
  course_id: string; // UUID reference to courses.id
  title: string; // TEXT NOT NULL
  description: string | null; // TEXT
  questions: any; // JSONB - could be more specifically typed
  deadline: string | null; // TIMESTAMPTZ
  created_at: string; // TIMESTAMPTZ
}

export interface ExamQuestion {
  id: string;
  text: string;
  options?: string[];
  correctAnswer?: string | number;
  points?: number;
  type?: 'multiple-choice' | 'essay' | 'file-upload';
}