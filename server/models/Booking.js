import { db } from "../config/db.js";

// Create a new booking
export const createBooking = (studentId, teacherId, courseId, date, time, callback) => {
  const sql = "INSERT INTO bookings (student_id, teacher_id, course_id, date, time, status) VALUES (?,?,?,?,?, 'requested')";
  db.query(sql, [studentId, teacherId, courseId, date, time], callback);
};

// Get booking by ID with student and course info
export const getBookingById = (id, callback) => {
  const sql = `
    SELECT b.id, b.teacher_id, b.student_id, b.course_id, b.date, b.time, b.status,
           u.name AS student_name,
           c.title AS course_title
    FROM bookings b
    JOIN users u ON b.student_id = u.id
    JOIN courses c ON b.course_id = c.id
    WHERE b.id = ?
  `;
  db.query(sql, [id], callback);
};

// Update booking status (e.g., teacher accepts)
export const updateBookingStatus = (id, status, callback) => {
  const sql = "UPDATE bookings SET status=? WHERE id=?";
  db.query(sql, [status, id], callback);
};

// Get all bookings for a teacher with student & course info
export const getBookingsByTeacher = (teacherId, callback) => {
  const sql = `
    SELECT b.id, b.status, b.date, b.time,
           u.name AS student_name,
           c.title AS course_title,
           v.room_id
    FROM bookings b
    JOIN users u ON b.student_id = u.id
    LEFT JOIN courses c ON b.course_id = c.id
    LEFT JOIN video_sessions v ON b.id = v.booking_id
    WHERE b.teacher_id = ?
    ORDER BY b.date ASC, b.time ASC
  `;
  db.query(sql, [teacherId], callback);
};


// Optionally: get all bookings for a student
export const getBookingsByStudent = (studentId, callback) => {
  const sql = `
    SELECT 
      b.id, 
      b.status, 
      b.date, 
      b.time,
      t.name AS teacher_name,
      c.title AS course_title,
      v.room_id
    FROM bookings b
    JOIN users t ON b.teacher_id = t.id
    LEFT JOIN courses c ON b.course_id = c.id
    LEFT JOIN video_sessions v ON b.id = v.booking_id
    WHERE b.student_id = ?
    ORDER BY b.date ASC, b.time ASC
  `;
  db.query(sql, [studentId], callback);
};


