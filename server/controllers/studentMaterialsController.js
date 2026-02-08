// File: server/controllers/studentMaterialsController.js
import { db } from "../config/db.js";

/**
 * GET /api/materials/student/enrollments
 * Get all courses the student is enrolled in
 */
export const getStudentEnrollments = (req, res) => {
  const studentId = req.user.id;

  const query = `
    SELECT 
      e.id as enrollment_id,
      e.course_id,
      c.title as course_title,
      c.description as course_description,
      c.teacher_id,
      u.name as teacher_name,
      e.package_name,
      e.status,
      COUNT(DISTINCT cm.id) as material_count
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN users u ON c.teacher_id = u.id
    LEFT JOIN course_materials cm ON c.id = cm.course_id
    WHERE e.student_id = ? AND e.status = 'paid'
    GROUP BY e.id, e.course_id, c.title, c.description, c.teacher_id, u.name, e.package_name, e.status
    ORDER BY e.enrolled_at DESC
  `;

  db.query(query, [studentId], (err, results) => {
    if (err) {
      console.error('❌ DB error in getStudentEnrollments:', err);
      return res.status(500).json({ 
        message: 'Database error', 
        error: err.message 
      });
    }
    
    console.log(`✅ Found ${results.length} enrolled courses for student ${studentId}`);
    res.json(results || []);
  });
};

/**
 * GET /api/materials/student/courses/:courseId/materials
 * Get all materials for a specific course (only if student is enrolled)
 */
export const getCourseMaterialsForStudent = (req, res) => {
  const studentId = req.user.id;
  const courseId = req.params.courseId;

  console.log('📥 Student requesting materials:', {
    studentId,
    courseId
  });

  // First, verify the student is enrolled in this course
  const enrollmentCheckQuery = `
    SELECT id 
    FROM enrollments 
    WHERE student_id = ? AND course_id = ? AND status = 'paid'
  `;

  db.query(enrollmentCheckQuery, [studentId, courseId], (err, enrollmentResults) => {
    if (err) {
      console.error('❌ Enrollment check error:', err);
      return res.status(500).json({ 
        message: 'Database error', 
        error: err.message 
      });
    }

    if (!enrollmentResults || enrollmentResults.length === 0) {
      console.log('❌ Student not enrolled in this course');
      return res.status(403).json({ 
        message: 'You are not enrolled in this course' 
      });
    }

    // Student is enrolled, fetch materials
    const materialsQuery = `
      SELECT 
        cm.id,
        cm.course_id,
        cm.teacher_id,
        cm.chapter_id,
        cm.title,
        cm.description,
        cm.file_url,
        cm.video_url,
        cm.created_at,
        u.name as teacher_name
      FROM course_materials cm
      LEFT JOIN users u ON cm.teacher_id = u.id
      WHERE cm.course_id = ?
      ORDER BY cm.created_at DESC
    `;

    db.query(materialsQuery, [courseId], (err, materials) => {
      if (err) {
        console.error('❌ Materials fetch error:', err);
        return res.status(500).json({ 
          message: 'Database error', 
          error: err.message 
        });
      }

      console.log(`✅ Found ${materials.length} materials for course ${courseId}`);
      res.json(materials || []);
    });
  });
};

/**
 * GET /api/materials/student/all-materials
 * Get all materials from all enrolled courses
 */
export const getAllMaterialsForStudent = (req, res) => {
  const studentId = req.user.id;

  const query = `
    SELECT 
      cm.id,
      cm.course_id,
      cm.teacher_id,
      cm.chapter_id,
      cm.title,
      cm.description,
      cm.file_url,
      cm.video_url,
      cm.created_at,
      c.title as course_title,
      u.name as teacher_name
    FROM course_materials cm
    JOIN courses c ON cm.course_id = c.id
    JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN users u ON cm.teacher_id = u.id
    WHERE e.student_id = ? AND e.status = 'paid'
    ORDER BY cm.created_at DESC
  `;

  db.query(query, [studentId], (err, results) => {
    if (err) {
      console.error('❌ DB error in getAllMaterialsForStudent:', err);
      return res.status(500).json({ 
        message: 'Database error', 
        error: err.message 
      });
    }
    
    console.log(`✅ Found ${results.length} total materials for student ${studentId}`);
    res.json(results || []);
  });
};
