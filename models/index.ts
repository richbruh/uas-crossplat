import type { Course } from './course';
import type { Lesson } from './lesson';
import type { Enrollment } from './enrollment';
import type { profile } from './profile';
import type { Progress } from './progress';

export * from './profile';
export * from './course';
export * from './lesson';
export * from './enrollment';
export * from './progress';
export * from './exam';
export * from './submission';

// You can also define relationships between models here if needed
export interface CourseWithLessons extends Course {
  lessons?: Lesson[];
}

export interface CourseWithEnrollment extends Course {
  enrollment?: Enrollment;
  progress_percentage?: number;
}

// User with their enrollments
export interface ProfileWithEnrollments extends profile {
  enrollments?: Enrollment[];
  courses?: Course[];
}

// Lesson with its progress data
export interface LessonWithProgress extends Lesson {
  progress?: Progress;
  completed?: boolean;
}