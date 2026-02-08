// File: server/controllers/teacherMaterialsController.js
import { db } from "../config/db.js";

// GET /api/teachers/courses
export const getTeacherCourses = (req, res) => {
  const teacherId = req.user.id;

  const query = `
    SELECT 
      c.id,
      c.title,
      c.description,
      c.created_at,
      COUNT(DISTINCT e.id) as enrollment_count,
      COUNT(DISTINCT cm.id) as material_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN course_materials cm ON c.id = cm.course_id
    WHERE c.teacher_id = ?
    GROUP BY c.id, c.title, c.description, c.created_at
    ORDER BY c.created_at DESC
  `;

  // CORRECT WAY: Use callback, not destructuring
  db.query(query, [teacherId], (err, results) => {
    if (err) {
      console.error('DB error in getTeacherCourses:', err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.json(results);
  });
};

// Alternative: If you want to use async/await with Promises
export const getTeacherCoursesAsync = async (req, res) => {
  const teacherId = req.user.id;

  const query = `
    SELECT 
      c.id,
      c.title,
      c.description,
      c.created_at,
      COUNT(DISTINCT e.id) as enrollment_count,
      COUNT(DISTINCT cm.id) as material_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN course_materials cm ON c.id = cm.course_id
    WHERE c.teacher_id = ?
    GROUP BY c.id, c.title, c.description, c.created_at
    ORDER BY c.created_at DESC
  `;

  try {
    // Promisify the query
    const results = await new Promise((resolve, reject) => {
      db.query(query, [teacherId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    res.json(results);
  } catch (err) {
    console.error('DB error in getTeacherCourses:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// GET /api/materials/teacher/courses/:courseId/materials
export const getCourseMaterials = (req, res) => {
  const teacherId = req.user.id;
  const courseId = req.params.courseId;

  console.log('📥 Fetching materials for course:', courseId, 'teacher:', teacherId);

  // Simplified query without chapters table (may not exist)
  const query = `
    SELECT 
      cm.id,
      cm.course_id,
      cm.teacher_id,
      cm.chapter_id,
      cm.title,
      cm.description,
      cm.file_url,
      cm.video_url,
      cm.created_at
    FROM course_materials cm
    WHERE cm.course_id = ? AND cm.teacher_id = ?
    ORDER BY cm.created_at DESC
  `;

  db.query(query, [courseId, teacherId], (err, results) => {
    if (err) {
      console.error('❌ DB error in getCourseMaterials:', err);
      return res.status(500).json({ 
        message: 'Database error', 
        error: err.message,
        sqlMessage: err.sqlMessage 
      });
    }
    
    console.log('✅ Found materials:', results.length);
    res.json(results || []);
  });
};

// POST /api/teachers/courses/:courseId/materials
export const createMaterial = (req, res) => {
  const teacherId = req.user.id;
  const courseId = req.params.courseId;
  const { chapter_id, title, description, file_url, video_url } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  const query = `
    INSERT INTO course_materials (course_id, teacher_id, chapter_id, title, description, file_url, video_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [courseId, teacherId, chapter_id || null, title, description || null, file_url || null, video_url || null],
    (err, result) => {
      if (err) {
        console.error('DB error in createMaterial:', err);
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      res.status(201).json({
        message: 'Material created successfully',
        materialId: result.insertId
      });
    }
  );
};

// PUT /api/teachers/materials/:materialId
export const updateMaterial = (req, res) => {
  const teacherId = req.user.id;
  const materialId = req.params.materialId;
  const { title, description, file_url, video_url, chapter_id } = req.body;

  const query = `
    UPDATE course_materials 
    SET 
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      file_url = COALESCE(?, file_url),
      video_url = COALESCE(?, video_url),
      chapter_id = COALESCE(?, chapter_id)
    WHERE id = ? AND teacher_id = ?
  `;

  db.query(
    query,
    [title, description, file_url, video_url, chapter_id, materialId, teacherId],
    (err, result) => {
      if (err) {
        console.error('DB error in updateMaterial:', err);
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Material not found or unauthorized' });
      }
      
      res.json({ message: 'Material updated successfully' });
    }
  );
};

// DELETE /api/teachers/materials/:materialId
export const deleteMaterial = (req, res) => {
  const teacherId = req.user.id;
  const materialId = req.params.materialId;

  const query = `
    DELETE FROM course_materials 
    WHERE id = ? AND teacher_id = ?
  `;

  db.query(query, [materialId, teacherId], (err, result) => {
    if (err) {
      console.error('DB error in deleteMaterial:', err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Material not found or unauthorized' });
    }
    
    res.json({ message: 'Material deleted successfully' });
  });
};

// Alias functions to match your routes
export const getMaterials = getCourseMaterials;

// POST /api/materials/teacher/courses/:courseId/materials
export const uploadMaterial = (req, res) => {
  const teacherId = req.user.id;
  const courseId = req.params.courseId;
  const { chapter_id, title, description, video_url } = req.body;

  console.log('📤 Upload material request:', {
    courseId,
    teacherId,
    title,
    hasFile: !!req.file
  });

  // File will be in req.file if uploaded via multer
  const file_url = req.file ? `/uploads/materials/${req.file.filename}` : null;

  if (!title || !title.trim()) {
    console.log('❌ Title is missing');
    return res.status(400).json({ message: 'Title is required' });
  }

  // First, verify the teacher owns this course
  const verifyQuery = `SELECT id FROM courses WHERE id = ? AND teacher_id = ?`;
  
  db.query(verifyQuery, [courseId, teacherId], (verifyErr, verifyResults) => {
    if (verifyErr) {
      console.error('❌ Verify course error:', verifyErr);
      return res.status(500).json({ 
        message: 'Database error during verification', 
        error: verifyErr.message 
      });
    }

    if (!verifyResults || verifyResults.length === 0) {
      console.log('❌ Teacher does not own this course');
      return res.status(403).json({ 
        message: 'You do not have permission to add materials to this course' 
      });
    }

    // Insert material
    const insertQuery = `
      INSERT INTO course_materials 
        (course_id, teacher_id, chapter_id, title, description, file_url, video_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertQuery,
      [
        courseId, 
        teacherId, 
        chapter_id || null, 
        title.trim(), 
        description?.trim() || null, 
        file_url, 
        video_url?.trim() || null
      ],
      (err, result) => {
        if (err) {
          console.error('❌ DB error in uploadMaterial:', err);
          return res.status(500).json({ 
            message: 'Database error during insert', 
            error: err.message,
            sqlMessage: err.sqlMessage
          });
        }
        
        console.log('✅ Material uploaded successfully:', result.insertId);
        res.status(201).json({
          message: 'Material uploaded successfully',
          materialId: result.insertId,
          file_url: file_url
        });
      }
    );
  });
};