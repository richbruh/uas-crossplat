/**
 * Represents a lesson within a course
 */
export interface Lesson {
  id: string; // UUID
  course_id: string; // UUID reference to courses.id
  title: string; // TEXT NOT NULL
  description?: string | null; // TEXT - Brief description of the lesson
  content: string | null; // TEXT - Full lesson content/materials
  lesson_type?: 'video' | 'text' | 'quiz' | 'assignment' | 'interactive'; // ENUM
  lesson_order: number; // INTEGER NOT NULL
  duration?: number | null; // INTEGER - Duration in minutes
  video_url?: string | null; // TEXT - URL for video lessons  is_published?: boolean; // BOOLEAN - Whether lesson is published  created_at: string; // TIMESTAMPTZ
  updated_at?: string; // TIMESTAMPTZ
}

/**
 * Extended interface for lessons with completion status
 */
export interface LessonWithProgress extends Lesson {
  is_completed?: boolean;
  completion_date?: string | null;
  user_progress?: number; // 0-100 percentage
}

/**
 * Helper functions for lessons
 */
export function formatLessonTitle(lesson: Lesson): string {
  return `Lesson ${lesson.lesson_order}: ${lesson.title}`;
}

export function getLessonDuration(lesson: Lesson): string {
  if (!lesson.duration) return 'N/A';
  if (lesson.duration < 60) return `${lesson.duration} min`;
  const hours = Math.floor(lesson.duration / 60);
  const minutes = lesson.duration % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function getLessonTypeIcon(type?: string): string {
  switch (type) {
    case 'video': return '🎥';
    case 'text': return '📄';
    case 'quiz': return '❓';
    case 'assignment': return '📝';
    case 'interactive': return '🎮';
    default: return '📚';
  }
}

export function getLessonTypeLabel(type?: string): string {
  switch (type) {
    case 'video': return 'Video';
    case 'text': return 'Reading';
    case 'quiz': return 'Quiz';
    case 'assignment': return 'Assignment';
    case 'interactive': return 'Interactive';
    default: return 'Lesson';
  }
}

export function isLessonAccessible(lesson: Lesson, isEnrolled: boolean): boolean {
  // Lessons are accessible only if user is enrolled in the course
  return isEnrolled;
}