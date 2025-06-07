import { supabase } from './supabase';

/**
 * Manually update total_lessons count for a specific course
 * Useful for data consistency checks
 */
export async function updateCourseLessonCount(courseId: string): Promise<boolean> {
  try {
    // Count actual lessons
    const { count, error: countError } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    if (countError) throw countError;

    // Update course total_lessons
    const { error: updateError } = await supabase
      .from('courses')
      .update({ total_lessons: count || 0 })
      .eq('id', courseId);

    if (updateError) throw updateError;

    console.log(`[COURSE_HELPER] Updated course ${courseId} total_lessons to ${count}`);
    return true;
  } catch (error) {
    console.error('[COURSE_HELPER] Error updating lesson count:', error);
    return false;
  }
}

/**
 * Update all courses' total_lessons count
 * Useful for database maintenance
 */
export async function updateAllCoursesLessonCount(): Promise<void> {
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id');

    if (error) throw error;

    for (const course of courses || []) {
      await updateCourseLessonCount(course.id);
    }

    console.log(`[COURSE_HELPER] Updated total_lessons for ${courses?.length || 0} courses`);
  } catch (error) {
    console.error('[COURSE_HELPER] Error updating all courses:', error);
  }
}