import express from 'express';
import { enrollCourse, getStudentEnrollments, getCourseEnrollments } from '../controllers/enrollmentController.js';
import { protect } from '../middlewares/authMiddleware.js'; // auth middleware to get logged-in user

const router = express.Router();

// Enroll in a course (called from checkout)
router.post('/:courseId/enroll', protect, enrollCourse);

// Get all enrollments of a student
router.get('/student/:studentId', protect, getStudentEnrollments);

// Get all enrollments for a course (admin/teacher)
router.get('/course/:courseId', protect, getCourseEnrollments);

export default router;
