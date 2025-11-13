import { db } from "../config/db.js";

export const createVideoSession = (bookingId, roomId, callback) => {
  const sql = "INSERT INTO video_sessions (booking_id, room_id) VALUES (?, ?)";
  db.query(sql, [bookingId, roomId], callback);
};

export const getVideoSessionByBooking = (bookingId, callback) => {
  const sql = "SELECT * FROM video_sessions WHERE booking_id = ?";
  db.query(sql, [bookingId], callback);
};
