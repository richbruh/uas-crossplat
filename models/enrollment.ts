/**
 * Represents a student's enrollment in a course
 */
export interface Enrollment {
  id: string; // UUID
  student_id: string; // UUID reference to profiles.user_id
  course_id: string; // UUID reference to courses.id
  enrolled_at: string; // TIMESTAMPTZ
  completed_lessons: number; // INTEGER default 0
  progress_percentage: number; // FLOAT default 0, calculated by trigger
}

/**
 * Helper functions for enrollments
 */
export function getFormattedEnrollmentDate(enrollment: Enrollment): string {
  return new Date(enrollment.enrolled_at).toLocaleDateString();
}

export function getProgressColor(progress: number): string {
  if (progress >= 75) return '#4caf50'; // Green for high progress
  if (progress >= 50) return '#ff9800'; // Orange for medium progress
  return '#f44336'; // Red for low progress
}