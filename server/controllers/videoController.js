import jwt from "jsonwebtoken";
import { createVideoSession, getVideoSessionByBooking } from "../models/VideoSession.js";
import { db } from "../config/db.js";

// Teacher accepts booking → generate video room + DB record
export const createVideoRoom = (req, res) => {
  const bookingId = req.params.bookingId;
  const roomId = `room_${bookingId}_${Date.now()}`;

  createVideoSession(bookingId, roomId, (err) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json({ message: "Video room created", roomId });
  });
};

// Authenticated user requests to join
export const getJoinToken = (req, res) => {
  const bookingId = req.params.bookingId;
  const user = req.user;

  getVideoSessionByBooking(bookingId, (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (!results.length) return res.status(404).json({ message: "No session found" });

    const roomId = results[0].room_id;
    const joinToken = jwt.sign(
      { roomId, userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "10m" } // short-lived
    );

    res.json({ roomId, joinToken });
  });
};
