import { db } from "../config/db.js";
export const getStudentDashboard = (req, res) => {
  return res.json({
    message: "Student dashboard data",
    user: req.user,
    courses: [
      { id: 1, title: "Intro to ML", progress: 45 },
      { id: 2, title: "Web Dev Basics", progress: 10 }
    ],
    upcomingSessions: []
  });
};
// GET all students who have bookings with this teacher
export const getStudentsForTeacher = (req, res) => {
  const teacherId = req.user.id; // comes from JWT

  const sql = `
    SELECT u.id, u.name, u.email
    FROM users u
    JOIN bookings b ON u.id = b.student_id
    WHERE b.teacher_id = ?
    GROUP BY u.id
  `;

  db.query(sql, [teacherId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }
    res.json(results);
  });
};
