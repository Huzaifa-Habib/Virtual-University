// File: server/routes/userRoutes.js
import express from 'express';
import { db } from '../config/db.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/users/:id
 * Get user details by ID (including teacher info if applicable)
 */
router.get('/:id', authenticateToken, (req, res) => {
  const userId = req.params.id;

  // Get basic user info
  const userQuery = `
    SELECT id, name, email, role, created_at 
    FROM users 
    WHERE id = ?
  `;

  db.query(userQuery, [userId], (err, userRows) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ message: 'Failed to fetch user details' });
    }

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRows[0];

    // If user is a teacher, get additional teacher info
    if (user.role === 'teacher') {
      const teacherQuery = `
        SELECT bio, expertise_tags, verification_status 
        FROM teachers 
        WHERE user_id = ?
      `;

      db.query(teacherQuery, [userId], (teacherErr, teacherRows) => {
        if (teacherErr) {
          console.error('Error fetching teacher info:', teacherErr);
          // Still return user data even if teacher query fails
          return res.json(user);
        }

        if (teacherRows && teacherRows.length > 0) {
          const teacher = teacherRows[0];
          user.bio = teacher.bio;
          user.expertise_tags = teacher.expertise_tags;
          user.verification_status = teacher.verification_status;
        }

        res.json(user);
      });
    } else {
      // Not a teacher, just return user data
      res.json(user);
    }
  });
});

export default router;