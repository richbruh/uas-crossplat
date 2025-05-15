/**
 * Represents a user's progress in a specific lesson
 */
export interface Progress {
  id: string; // UUID
  user_id: string; // UUID reference to profiles.user_id
  lesson_id: string; // UUID reference to lessons.id
  course_id: string; // UUID reference to courses.id
  completion_percentage: number; // FLOAT between 0 and 100
  last_accessed: string; // TIMESTAMPTZ
}

export function getFormattedLastAccessed(progress: Progress): string {
  const date = new Date(progress.last_accessed);
  return date.toLocaleDateString();
}

export function getProgressStatus(percentage: number): string {
  if (percentage === 0) return 'Not Started';
  if (percentage < 100) return 'In Progress';
  return 'Completed';
}