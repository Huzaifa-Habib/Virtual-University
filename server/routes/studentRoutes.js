import express from "express";
import { getStudentsForTeacher } from "../controllers/studentController.js";

const router = express.Router();

// GET students enrolled with this teacher
router.get("/", getStudentsForTeacher);

export default router;
