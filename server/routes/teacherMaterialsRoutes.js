// File: server/routes/teacherMaterialsRoutes.js
import express from "express";
import upload from "../config/multerMaterial.js";
import { 
  uploadMaterial, 
  getMaterials,
  getTeacherCourses,
  updateMaterial,
  deleteMaterial
} from "../controllers/teacherMaterialsController.js";
import { protect as authTeacher } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get all courses for the logged-in teacher
router.get("/teacher/courses", authTeacher, getTeacherCourses);

// Upload a material with file
router.post(
  "/teacher/courses/:courseId/materials",
  authTeacher,
  upload.single("material_file"),
  uploadMaterial
);

// Get materials for a course
router.get(
  "/teacher/courses/:courseId/materials",
  authTeacher,
  getMaterials
);

// Update a material
router.put("/teacher/materials/:materialId", authTeacher, updateMaterial);

// Delete a material
router.delete("/teacher/materials/:materialId", authTeacher, deleteMaterial);

export default router;