/**
 * Represents an educational course
 */
export interface Course {
  id: string; // UUID
  title: string; // TEXT NOT NULL
  grade_level: number; // INTEGER between 1 and 6
  description: string | null; // TEXT
  thumbnail_url: string | null; // TEXT
  teacher_id: string | null; // UUID reference to profiles.user_id
  total_lessons: number; // INTEGER default 0
  created_at: string; // TIMESTAMPTZ
}

export function getGradeLevelLabel(level: number): string {
  return `Grade ${level}`;
}

export function getCourseDuration(totalLessons: number): string {
  // Assuming each lesson takes about 30 minutes
  const hours = Math.ceil(totalLessons * 0.5);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}