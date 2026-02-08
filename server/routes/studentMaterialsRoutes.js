// File: server/routes/studentMaterialsRoutes.js
import express from "express";
import { 
  getStudentEnrollments,
  getCourseMaterialsForStudent,
  getAllMaterialsForStudent
} from "../controllers/studentMaterialsController.js";
import { protect as authStudent } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get all courses student is enrolled in (with material count)
router.get("/student/enrollments", authStudent, getStudentEnrollments);

// Get materials for a specific course (with enrollment check)
router.get("/student/courses/:courseId/materials", authStudent, getCourseMaterialsForStudent);

// Get all materials from all enrolled courses
router.get("/student/all-materials", authStudent, getAllMaterialsForStudent);

export default router;
