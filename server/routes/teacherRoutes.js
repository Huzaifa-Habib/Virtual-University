import express from "express";
import { listTeachers, getTeacherProfile, updateTeacherProfile } from "../controllers/teacherController.js";
import { getTeacherCourses } from "../controllers/teacherMaterialsController.js";
import { protect as authTeacher } from "../middlewares/authMiddleware.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";
import { uploadProfileImage } from "../config/multerProfile.js";

const router = express.Router();

// List all teachers
router.get("/", listTeachers);

// Get courses for logged-in teacher
router.get("/courses", authTeacher, getTeacherCourses);

// Get teacher profile (for students/teachers)
router.get("/:teacherId/profile", authTeacher, allowRoles("teacher", "student", "admin"), getTeacherProfile);

// Update teacher profile
router.put(
  "/profile",
  authTeacher,
  allowRoles("teacher"),
  uploadProfileImage.single("profile_image"),
  updateTeacherProfile
);

export default router;
