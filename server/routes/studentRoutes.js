import express from "express";
import { getStudentsForTeacher } from "../controllers/studentController.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// GET students enrolled with this teacher
router.get("/", allowRoles("teacher"), getStudentsForTeacher);

export default router;
