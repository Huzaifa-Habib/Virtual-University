import { getAllTeachers } from "../models/Teacher.js";

export const listTeachers = (req, res) => {
  getAllTeachers((err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(results);
  });
};
// 2️⃣ for /api/dashboard/teacher
export const getTeacherDashboard = (req, res) => {
  return res.json({
    message: "Teacher dashboard data",
    user: req.user,
    courses: [
      { id: 10, title: "Advanced Node.js", students: 32 },
      { id: 11, title: "WebRTC Essentials", students: 12 }
    ],
    pendingBookings: []
  });
};
