import express from "express";
import { listTeachers } from "../controllers/teacherController.js";
import { getTeacherCourses } from "../controllers/teacherMaterialsController.js";
import { protect as authTeacher } from "../middlewares/authMiddleware.js";

const router = express.Router();

// List all teachers
router.get("/", listTeachers);

// Get courses for logged-in teacher
router.get("/courses", authTeacher, getTeacherCourses);

export default router;
