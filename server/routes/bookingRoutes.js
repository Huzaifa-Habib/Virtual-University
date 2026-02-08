import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";
import { requestBooking, acceptBooking, getBooking } from "../controllers/bookingController.js";
import { getBookingsByTeacher, getBookingsByStudent } from "../models/Booking.js";

const router = express.Router();

// Teacher: get all bookings assigned to them
router.get("/", protect, allowRoles("teacher"), (req, res) => {
  const teacherId = req.user.id;
  getBookingsByTeacher(teacherId, (err, results) => {
    if (err) {
      console.error("MySQL error:", err);
      return res.status(500).json({ message: "Failed to fetch teacher bookings" });
    }
    const bookings = results.map(b => ({
      id: b.id,
      courseTitle: b.course_title || "",
      studentName: b.student_name || "",
      date: b.date,
      time: b.time,
      status: b.status,
      roomId: b.room_id || null
    }));
    res.json(bookings);
  });
});

// Student: get all bookings assigned to them
router.get("/student", protect, allowRoles("student"), (req, res) => {
  const studentId = req.user.id;
  getBookingsByStudent(studentId, (err, results) => {
    if (err) {
      console.error("MySQL error:", err);
      return res.status(500).json({ message: "Failed to fetch student bookings" });
    }
 const bookings = results.map(b => ({
  id: b.id,
  courseTitle: b.course_title || "",
  teacherName: b.teacher_name || "",
  date: b.date,           // ✅ FIX
  time: b.time,           // ✅ FIX
  status: b.status,
  roomId: b.room_id || null
}));


    res.json(bookings);
  });
});

// Student: request a new booking
router.post("/", protect, allowRoles("student"), requestBooking);

// Get a single booking by ID (accessible by both roles)
router.get("/:id", protect, getBooking);

// Teacher: accept a booking
router.post("/:id/accept", protect, allowRoles("teacher"), acceptBooking);

export default router;
