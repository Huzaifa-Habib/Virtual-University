import { db } from "../config/db.js";

// POST /api/courses/:courseId/enroll
export const enrollCourse = (req, res) => {
  const studentId = req.user.id;
  const courseId = req.params.courseId;
  const { tier, price_paid } = req.body;

  if(!tier || !price_paid) return res.status(400).json({ message: 'Package and price required' });

  const query = `
    INSERT INTO enrollments (student_id, course_id, package_name, price_paid, status)
    VALUES (?, ?, ?, ?, 'paid')
    ON DUPLICATE KEY UPDATE package_name = VALUES(package_name), price_paid = VALUES(price_paid), status='paid', enrolled_at = CURRENT_TIMESTAMP
  `;

  db.query(query, [studentId, courseId, tier, price_paid], (err, result) => {
    if(err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Enrolled successfully', enrollmentId: result.insertId });
  });
};

// GET /api/enrollments/student/:studentId
export const getStudentEnrollments = (req, res) => {
  const studentId = req.params.studentId;

  const query = `
    SELECT 
      e.id AS enrollment_id,
      e.package_name,
      e.price_paid,
      e.status,
      e.enrolled_at,
      c.id AS course_id,
      c.title AS course_title,
      u.name AS teacher_name
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN users u ON c.teacher_id = u.id
    WHERE e.student_id = ?
  `;

  db.query(query, [studentId], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
};


// GET /api/enrollments/course/:courseId
export const getCourseEnrollments = (req, res) => {
  const courseId = req.params.courseId;

  const query = `
    SELECT e.*, u.name as student_name
    FROM enrollments e
    JOIN users u ON e.student_id = u.id
    WHERE e.course_id = ?
  `;

  db.query(query, [courseId], (err, results) => {
    if(err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
};
