// File: server/controllers/teacherController.js
import { db } from "../config/db.js";

/**
 * GET /api/teachers
 * List all teachers with their details
 */
export const listTeachers = (req, res) => {
  const query = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.created_at,
      t.bio,
      t.expertise_tags,
      t.verification_status,
      COUNT(DISTINCT c.id) as course_count
    FROM users u
    LEFT JOIN teachers t ON u.id = t.user_id
    LEFT JOIN courses c ON u.id = c.teacher_id
    WHERE u.role = 'teacher'
    GROUP BY u.id, u.name, u.email, u.created_at, t.bio, t.expertise_tags, t.verification_status
    ORDER BY u.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching teachers:', err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
};

/**
 * GET /api/dashboard/teacher
 * Get teacher dashboard data (courses, bookings, stats)
 */
export const getTeacherDashboard = (req, res) => {
  const teacherId = req.user.id;

  // Query for teacher's courses with enrollment count
  const coursesQuery = `
    SELECT 
      c.id,
      c.title,
      c.description,
      COUNT(DISTINCT e.id) as student_count,
      COUNT(DISTINCT cm.id) as material_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'paid'
    LEFT JOIN course_materials cm ON c.id = cm.course_id
    WHERE c.teacher_id = ?
    GROUP BY c.id, c.title, c.description
  `;

  // Query for pending bookings
  const bookingsQuery = `
    SELECT 
      b.id,
      b.date,
      b.time,
      b.status,
      c.title as course_title,
      u.name as student_name
    FROM bookings b
    LEFT JOIN courses c ON b.course_id = c.id
    LEFT JOIN users u ON b.student_id = u.id
    WHERE b.teacher_id = ? AND b.status = 'requested'
    ORDER BY b.date ASC, b.time ASC
    LIMIT 10
  `;

  // Execute both queries
  db.query(coursesQuery, [teacherId], (err1, courses) => {
    if (err1) {
      console.error('Error fetching courses:', err1);
      return res.status(500).json({ message: 'Database error', error: err1.message });
    }

    db.query(bookingsQuery, [teacherId], (err2, bookings) => {
      if (err2) {
        console.error('Error fetching bookings:', err2);
        return res.status(500).json({ message: 'Database error', error: err2.message });
      }

      // Calculate stats
      const totalStudents = courses.reduce((sum, c) => sum + (c.student_count || 0), 0);
      const totalMaterials = courses.reduce((sum, c) => sum + (c.material_count || 0), 0);

      res.json({
        teacher: {
          id: req.user.id,
          name: req.user.name,
          role: req.user.role
        },
        stats: {
          totalCourses: courses.length,
          totalStudents: totalStudents,
          totalMaterials: totalMaterials,
          pendingBookings: bookings.length
        },
        courses: courses,
        pendingBookings: bookings
      });
    });
  });
};

/**
 * GET /api/teachers/:teacherId/profile
 * Get detailed teacher profile
 */
export const getTeacherProfile = (req, res) => {
  const teacherId = req.params.teacherId;

  const query = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.created_at,
      t.bio,
      t.profile_image_url,
      t.expertise_tags,
      t.verification_status
    FROM users u
    LEFT JOIN teachers t ON u.id = t.user_id
    WHERE u.id = ? AND u.role = 'teacher'
  `;
  

  const coursesQuery = `
    SELECT 
      c.id,
      c.title,
      c.description,
      COUNT(DISTINCT e.id) as student_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'paid'
    WHERE c.teacher_id = ?
    GROUP BY c.id, c.title, c.description
    ORDER BY c.title ASC
  `;
  db.query(query, [teacherId], (err, results) => {
    if (err) {
      console.error('Error fetching teacher profile:', err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }

    if (!results || results.length === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const profile = results[0];

    db.query(coursesQuery, [teacherId], (coursesErr, courses) => {
      if (coursesErr) {
        console.error('Error fetching teacher courses:', coursesErr);
        return res.status(500).json({ message: 'Database error', error: coursesErr.message });
      }

      const totalStudents = (courses || []).reduce(
        (sum, course) => sum + (course.student_count || 0),
        0
      );

      res.json({
        profile,
        courses: courses || [],
        stats: {
          totalCourses: (courses || []).length,
          totalStudents
        }
      });
    });
  });
};

/**
 * PUT /api/teachers/profile
 * Update teacher profile (name, bio, profile image)
 */
export const updateTeacherProfile = (req, res) => {
  console.log('Body:', req.body); // Check if bio is here
  console.log('File:', req.file);
  const teacherId = req.user.id;
  const { name, bio } = req.body;
  const profileImageUrl = req.file ? `/uploads/avatars/${req.file.filename}` : null;

  const updateUserQuery = `
    UPDATE users 
    SET name = COALESCE(?, name)
    WHERE id = ?
  `;

 const updateTeacherQuery = `
  INSERT INTO teachers (user_id, bio, profile_image_url)
  VALUES (?, ?, ?)
  ON DUPLICATE KEY UPDATE 
    bio = COALESCE(VALUES(bio), bio),
    profile_image_url = COALESCE(VALUES(profile_image_url), profile_image_url)
`;

  db.query(updateUserQuery, [name || null, teacherId], (userErr) => {
    if (userErr) {
      console.error('Error updating teacher name:', userErr);
      return res.status(500).json({ message: 'Failed to update teacher name' });
    }

    db.query(updateTeacherQuery, [teacherId, bio || null, profileImageUrl], (teacherErr) => {
      if (teacherErr) {
        console.error('Error updating teacher profile:', teacherErr);
        return res.status(500).json({ message: 'Failed to update teacher profile' });
      }

      res.json({
        message: 'Profile updated successfully',
        profile: {
          id: teacherId,
          name,
          bio,
          profile_image_url: profileImageUrl
        }
      });
    });
  });
  
};