import { Course, Lesson } from '@/types';

export const mockCourses: Course[] = [
  {
    id: '1',
    title: 'Introduction to React Native',
    description: 'Learn the fundamentals of building mobile apps with React Native. This course covers everything from basic components to advanced navigation patterns.',
    instructor: 'Sarah Johnson',
    thumbnail: 'https://images.pexels.com/photos/11035380/pexels-photo-11035380.jpeg',
    duration: '10 hours',
    lessons: 24,
    rating: 4.8,
    category: 'Programming',
    level: 'Beginner',
    tags: ['React Native', 'Mobile Development', 'JavaScript'],
    enrolled: true,
    progress: 35,
  },
  {
    id: '2',
    title: 'Advanced UI Design Principles',
    description: 'Master the art of creating beautiful user interfaces with advanced design principles. Learn about color theory, typography, and visual hierarchy.',
    instructor: 'Michael Chen',
    thumbnail: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg',
    duration: '8 hours',
    lessons: 18,
    rating: 4.7,
    category: 'Design',
    level: 'Intermediate',
    tags: ['UI/UX', 'Design', 'Creativity'],
    enrolled: true,
    progress: 65,
  },
  {
    id: '3',
    title: 'Full-Stack Web Development',
    description: 'Comprehensive guide to becoming a full-stack developer. Build complete web applications from front-end to back-end.',
    instructor: 'David Wilson',
    thumbnail: 'https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg',
    duration: '15 hours',
    lessons: 32,
    rating: 4.9,
    category: 'Programming',
    level: 'Advanced',
    tags: ['Full-Stack', 'JavaScript', 'Node.js', 'React'],
  },
  {
    id: '4',
    title: 'Data Science Fundamentals',
    description: 'Introduction to the world of data science. Learn about data analysis, visualization, and machine learning basics.',
    instructor: 'Emily Parker',
    thumbnail: 'https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg',
    duration: '12 hours',
    lessons: 28,
    rating: 4.6,
    category: 'Data Science',
    level: 'Beginner',
    tags: ['Data Analysis', 'Python', 'Statistics'],
  },
  {
    id: '5',
    title: 'Digital Marketing Masterclass',
    description: 'Comprehensive guide to modern digital marketing strategies. Learn SEO, social media marketing, content creation, and more.',
    instructor: 'Jessica Lee',
    thumbnail: 'https://images.pexels.com/photos/905163/pexels-photo-905163.jpeg',
    duration: '9 hours',
    lessons: 20,
    rating: 4.5,
    category: 'Marketing',
    level: 'Intermediate',
    tags: ['Digital Marketing', 'SEO', 'Social Media'],
  },
  {
    id: '6',
    title: 'iOS App Development with Swift',
    description: 'Learn to build iOS applications using Swift programming language. From basic UI components to complex app architectures.',
    instructor: 'Robert Martin',
    thumbnail: 'https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg',
    duration: '14 hours',
    lessons: 30,
    rating: 4.7,
    category: 'Programming',
    level: 'Intermediate',
    tags: ['iOS', 'Swift', 'Mobile Development'],
  },
];

export const mockLessons: Lesson[] = [
  // Course 1 - React Native
  {
    id: '1-1',
    courseId: '1',
    title: 'Getting Started with React Native',
    duration: '25 min',
    videoUrl: 'https://example.com/videos/react-native-intro',
    completed: true,
    type: 'video',
    order: 1,
  },
  {
    id: '1-2',
    courseId: '1',
    title: 'Core Components and APIs',
    duration: '30 min',
    videoUrl: 'https://example.com/videos/react-native-components',
    completed: true,
    type: 'video',
    order: 2,
  },
  {
    id: '1-3',
    courseId: '1',
    title: 'Navigation Fundamentals',
    duration: '35 min',
    videoUrl: 'https://example.com/videos/react-native-navigation',
    completed: false,
    type: 'video',
    order: 3,
  },
  {
    id: '1-4',
    courseId: '1',
    title: 'Module 1 Assessment',
    duration: '15 min',
    completed: false,
    type: 'quiz',
    order: 4,
  },
  
  // Course 2 - UI Design
  {
    id: '2-1',
    courseId: '2',
    title: 'Design Principles Overview',
    duration: '28 min',
    videoUrl: 'https://example.com/videos/ui-design-principles',
    completed: true,
    type: 'video',
    order: 1,
  },
  {
    id: '2-2',
    courseId: '2',
    title: 'Color Theory in UI Design',
    duration: '32 min',
    videoUrl: 'https://example.com/videos/color-theory',
    completed: true,
    type: 'video',
    order: 2,
  },
  {
    id: '2-3',
    courseId: '2',
    title: 'Typography Fundamentals',
    duration: '25 min',
    videoUrl: 'https://example.com/videos/typography',
    completed: true,
    type: 'video',
    order: 3,
  },
  {
    id: '2-4',
    courseId: '2',
    title: 'Visual Hierarchy and Layout',
    duration: '30 min',
    videoUrl: 'https://example.com/videos/visual-hierarchy',
    completed: false,
    type: 'video',
    order: 4,
  },
];

export const getRecommendedCourses = (): Course[] => {
  return mockCourses.slice(2, 6);
};

export const getPopularCourses = (): Course[] => {
  return [...mockCourses].sort((a, b) => b.rating - a.rating).slice(0, 4);
};

export const getEnrolledCourses = (): Course[] => {
  return mockCourses.filter(course => course.enrolled);
};

export const getCourseById = (id: string): Course | undefined => {
  return mockCourses.find(course => course.id === id);
};

export const getLessonsByCourseId = (courseId: string): Lesson[] => {
  return mockLessons.filter(lesson => lesson.courseId === courseId)
    .sort((a, b) => a.order - b.order);
};

export const getLessonById = (id: string): Lesson | undefined => {
  return mockLessons.find(lesson => lesson.id === id);
};