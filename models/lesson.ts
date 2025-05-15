/**
 * Represents a lesson within a course
 */
export interface Lesson {
  id: string; // UUID
  course_id: string; // UUID reference to courses.id
  title: string; // TEXT NOT NULL
  content: string | null; // TEXT
  lesson_order: number; // INTEGER NOT NULL
  created_at: string; // TIMESTAMPTZ
}

export function formatLessonTitle(lesson: Lesson): string {
  return `Lesson ${lesson.lesson_order}: ${lesson.title}`;
}