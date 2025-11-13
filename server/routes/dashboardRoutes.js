import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";
import { getStudentDashboard } from "../controllers/studentController.js";
import { getTeacherDashboard } from "../controllers/teacherController.js";
import { getAdminDashboard } from "../controllers/adminController.js";

const router = express.Router();

router.get("/student", protect, allowRoles("student"), getStudentDashboard);
router.get("/teacher", protect, allowRoles("teacher"), getTeacherDashboard);
router.get("/admin", protect, allowRoles("admin"), getAdminDashboard);

export default router;
