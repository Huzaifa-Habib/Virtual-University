// server/controllers/courseController.js
import { db } from "../config/db.js";

export const getAllCourses = (req, res) => {
  const query = `
    SELECT 
      c.id, 
      c.title, 
      c.description, 
      c.created_at, 
      u.id AS teacher_id, 
      u.name AS teacher_name, 
      u.email AS teacher_email
    FROM courses c
    LEFT JOIN users u ON c.teacher_id = u.id
    ORDER BY c.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching courses:", err);
      return res.status(500).json({ message: "Failed to fetch courses." });
    }
    res.json(results); // Now each course includes teacher_name and teacher_email
  });
};


export const getCoursePackages = (req, res) => {
  const courseId = req.params.id;
  db.query(
    'SELECT * FROM course_packages WHERE course_id = ?',
    [courseId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        features: JSON.parse(pkg.features)
      })));
    }
  );
};



export const getCourseById = (req, res) => {
  const courseId = req.params.id;

  const query = `
    SELECT c.id, c.title, c.description, c.teacher_id, u.name AS teacher_name
    FROM courses c
    JOIN users u ON c.teacher_id = u.id
    WHERE c.id = ?
  `;

  db.query(query, [courseId], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!results.length) return res.status(404).json({ message: 'Course not found' });
    res.json(results[0]);
  });
};



