import express from "express";
import { listTeachers } from "../controllers/teacherController.js";

const router = express.Router();
router.get("/", listTeachers);
export default router;
