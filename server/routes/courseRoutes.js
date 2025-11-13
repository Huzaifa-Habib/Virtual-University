import express from 'express';
import { getAllCourses, getCoursePackages, getCourseById } from '../controllers/courseController.js';

const router = express.Router();

// All courses with teacher info
router.get('/', getAllCourses);
// You need this for individual course fetch:
router.get("/:id", getCourseById);

// Packages for a specific course
router.get('/:id/packages', getCoursePackages);

export default router;
