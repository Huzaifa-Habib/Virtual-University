import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

import { db } from "./config/db.js";
import { createUserTable } from "./models/User.js";
import { createCourseInsightsTable } from "./models/CourseInsights.js";
import { initSocketServer } from "./socketServer.js";
import { protect } from "./middlewares/authMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import courseRoutes from './routes/courseRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import teacherMaterialsRoutes from "./routes/teacherMaterialsRoutes.js";
import studentMaterialsRoutes from "./routes/studentMaterialsRoutes.js";
import userRoutes from './routes/userRoutes.js';
import chatbotRoutes from "./routes/chatbotRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
dotenv.config();

const app = express();
// fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "uploads");
const avatarsDir = path.join(uploadsDir, "avatars");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir);
}

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Initialize tables
createUserTable(db);
createCourseInsightsTable(db);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/students", protect, studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use("/api", teacherMaterialsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/materials', teacherMaterialsRoutes);
app.use('/api/materials', studentMaterialsRoutes);
app.use("/api/chatbot", chatbotRoutes);


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
