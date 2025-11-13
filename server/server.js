import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

import { db } from "./config/db.js";
import { createUserTable } from "./models/User.js";
import { initSocketServer } from "./socketServer.js";
import { protect } from "./middlewares/authMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize tables
createUserTable(db);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/students", protect, studentRoutes);

// Default route
app.get("/", (req, res) => res.send("Virtual University API running..."));

// Create one HTTP server for both Express & Socket.IO
const PORT = process.env.PORT || 5000;
const serverHttp = http.createServer(app);

// Initialize Socket.IO
initSocketServer(serverHttp);

// ✅ Only one listen call
serverHttp.listen(PORT, () => {
  console.log(`✅ Socket server ready`);
  console.log(`🚀 Server running on port ${PORT}`);
});
