import { createBooking, getBookingById, updateBookingStatus, getBookingsByTeacher, getBookingsByStudent } from "../models/Booking.js";
import { createVideoSession, getVideoSessionByBooking } from "../models/VideoSession.js";

// Student: request a booking


export const requestBooking = (req, res) => {
  const studentId = req.user.id;
  const { teacherId, courseId, datetime } = req.body;
  console.log("🟡 RAW BODY:", req.body);


  if (!teacherId || !datetime) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const dt = new Date(datetime);
  if (isNaN(dt)) {
    return res.status(400).json({ message: "Invalid datetime" });
  }

  const date = dt.toISOString().split("T")[0];  // 2025-02-24
  const time = dt.toISOString().split("T")[1].slice(0,5); // 14:30
  console.log("🟢 AFTER PARSE:", { date, time });


  createBooking(studentId, teacherId, courseId || null, date, time, (err, result) => {
    if (err) {
      console.error("MySQL error:", err);
      return res.status(500).json({ message: "Failed to create booking" });
    }

    res.status(201).json({
      message: "Booking requested",
      bookingId: result.insertId
    });
  });
};



// Teacher: accept a booking
export const acceptBooking = (req, res) => {
  const bookingId = req.params.id;
  updateBookingStatus(bookingId, "accepted", (err) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    getVideoSessionByBooking(bookingId, (fetchErr, results) => {
      if (fetchErr) {
        return res.status(500).json({ message: "DB error", error: fetchErr });
      }

      if (results.length) {
        return res.json({ message: "Booking accepted", roomId: results[0].room_id });
      }

      const roomId = `room_${bookingId}_${Date.now()}`;
      createVideoSession(bookingId, roomId, (createErr) => {
        if (createErr) {
          return res.status(500).json({ message: "DB error", error: createErr });
        }
        return res.json({ message: "Booking accepted", roomId });
      });
    });
  });
};

// Get single booking by ID
export const getBooking = (req, res) => {
  const bookingId = req.params.id;
  getBookingById(bookingId, (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (!result.length) return res.status(404).json({ message: "Booking not found" });
    res.json(result[0]);
  });
};

// Teacher: get all bookings
export const getTeacherBookings = (req, res) => {
  const teacherId = req.user.id;
  getBookingsByTeacher(teacherId, (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });

    const formatted = results.map(b => ({
      id: b.id,
      studentName: b.student_name,
      courseTitle: b.course_title,
      date: b.date,
      time: b.time,
      status: b.status
    }));

    res.json(formatted);
  });
};

// Student: get all bookings
export const getStudentBookings = (req, res) => {
  const studentId = req.user.id;
  getBookingsByStudent(studentId, (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });

    const formatted = results.map(b => ({
      id: b.id,
      teacherName: b.teacher_name,
      courseTitle: b.course_title,
      date: b.date,
      time: b.time,
      status: b.status
    }));

    res.json(formatted);
  });
};
