import { Course, Lesson } from '@/types';
import { supabase } from '@/app/utils/supabase';

export const mockCourses: Course[] = [
  {
    id: '1',
    title: 'Introduction to React Native',
    grade_level: 1,
    description: 'Learn the fundamentals of building mobile apps with React Native. This course covers everything from basic components to advanced navigation patterns.',
    thumbnail_url: 'https://images.pexels.com/photos/11035380/pexels-photo-11035380.jpeg',
    teacher_id: 'teacher_1',
    total_lessons: 24,
    created_at: '2024-05-01T10:00:00Z',
  },
  {
    id: '2',
    title: 'Advanced UI Design Principles',
    grade_level: 2,
    description: 'Master the art of creating beautiful user interfaces with advanced design principles. Learn about color theory, typography, and visual hierarchy.',
    thumbnail_url: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg',
    teacher_id: 'teacher_2',
    total_lessons: 18,
    created_at: '2024-05-03T10:00:00Z',
  },
  {
    id: '3',
    title: 'Full-Stack Web Development',
    grade_level: 3,
    description: 'Comprehensive guide to becoming a full-stack developer. Build complete web applications from front-end to back-end.',
    thumbnail_url: 'https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg',
    teacher_id: 'teacher_3',
    total_lessons: 32,
    created_at: '2024-05-05T10:00:00Z',
  },
  {
    id: '4',
    title: 'Data Science Fundamentals',
    grade_level: 1,
    description: 'Introduction to the world of data science. Learn about data analysis, visualization, and machine learning basics.',
    thumbnail_url: 'https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg',
    teacher_id: 'teacher_4',
    total_lessons: 28,
    created_at: '2024-05-07T10:00:00Z',
  },
  {
    id: '5',
    title: 'Digital Marketing Masterclass',
    grade_level: 2,
    description: 'Comprehensive guide to modern digital marketing strategies. Learn SEO, social media marketing, content creation, and more.',
    thumbnail_url: 'https://images.pexels.com/photos/905163/pexels-photo-905163.jpeg',
    teacher_id: 'teacher_5',
    total_lessons: 20,
    created_at: '2024-05-09T10:00:00Z',
  },
  {
    id: '6',
    title: 'iOS App Development with Swift',
    grade_level: 2,
    description: 'Learn to build iOS applications using Swift programming language. From basic UI components to complex app architectures.',
    thumbnail_url: 'https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg',
    teacher_id: 'teacher_6',
    total_lessons: 30,
    created_at: '2024-05-11T10:00:00Z',
  },
];

export async function fetchCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*');
  if (error) throw error;
  return data as Course[];
};

// // Example: Fetch enrolled courses from Supabase (if you have an 'enrolled' field)
// export const fetchEnrolledCoursesFromSupabase = async (): Promise<Course[]> => {
//   const { data, error } = await supabase
//     .from('courses')
//     .select('*')
//     .eq('enrolled', true);
//   if (error) throw error;
//   return data as Course[];
// };

export const mockLessons: Lesson[] = [
  {
    id: '1-1',
    course_id: '1',
    title: 'Getting Started with React Native',
    content: 'Introduction and setup for React Native development.',
    lesson_order: 1,
    created_at: '2024-05-01T10:00:00Z',
  },
  {
    id: '1-2',
    course_id: '1',
    title: 'Core Components and APIs',
    content: 'Learn about core components and APIs in React Native.',
    lesson_order: 2,
    created_at: '2024-05-01T10:30:00Z',
  },
  {
    id: '1-3',
    course_id: '1',
    title: 'Navigation Fundamentals',
    content: 'Understand navigation in React Native apps.',
    lesson_order: 3,
    created_at: '2024-05-01T11:00:00Z',
  },
  {
    id: '2-1',
    course_id: '2',
    title: 'Design Principles Overview',
    content: 'Overview of essential UI/UX design principles.',
    lesson_order: 1,
    created_at: '2024-05-03T10:00:00Z',
  },
  {
    id: '2-2',
    course_id: '2',
    title: 'Color Theory in UI Design',
    content: 'Learn about color theory and its application in UI.',
    lesson_order: 2,
    created_at: '2024-05-03T10:30:00Z',
  },
  {
    id: '2-3',
    course_id: '2',
    title: 'Typography Fundamentals',
    content: 'Understand typography for better readability and aesthetics.',
    lesson_order: 3,
    created_at: '2024-05-03T11:00:00Z',
  },
  {
    id: '2-4',
    course_id: '2',
    title: 'Visual Hierarchy and Layout',
    content: 'Learn about visual hierarchy and effective layout techniques.',
    lesson_order: 4,
    created_at: '2024-05-03T11:30:00Z',
  },
];

// export const getRecommendedCourses = (): Course[] => {
//   return mockCourses.slice(2, 6);
// };

// export const getPopularCourses = (): Course[] => {
//   return [...mockCourses].sort((a, b) => b.rating - a.rating).slice(0, 4);
// };

// export const getEnrolledCourses = (): Course[] => {
//   return mockCourses.filter(course => course.enrolled);
// };

export const getCourseById = (id: string): Course | undefined => {
  return mockCourses.find(course => course.id === id);
};

export const getLessonsByCourseId = (courseId: string): Lesson[] => {
  return mockLessons.filter(lesson => lesson.course_id === courseId);
    
}; 

export const getLessonById = (id: string): Lesson | undefined => {
  return mockLessons.find(lesson => lesson.id === id);
};