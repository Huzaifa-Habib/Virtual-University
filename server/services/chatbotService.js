import { db } from "../config/db.js";

const normalizeTag = (tag) => tag.trim().toLowerCase();

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((tag) => String(tag));
  if (typeof tags === "string") return tags.split(",");
  return [];
};

const extractTags = (rawTags) =>
  parseTags(rawTags)
    .map((tag) => normalizeTag(String(tag)))
    .filter(Boolean);

const fetchTeacherMetrics = () => {
  const sql = `
    SELECT
      u.id AS teacher_id,
      u.name,
      t.bio,
      t.expertise_tags,
      COALESCE(enrollments.enrollment_count, 0) AS enrollment_count,
      COALESCE(bookings.booking_count, 0) AS booking_count
    FROM users u
    JOIN teachers t ON u.id = t.user_id
    LEFT JOIN (
      SELECT
        c.teacher_id,
        COUNT(DISTINCT e.id) AS enrollment_count
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'paid'
      GROUP BY c.teacher_id
    ) AS enrollments ON enrollments.teacher_id = u.id
    LEFT JOIN (
      SELECT
        b.teacher_id,
        COUNT(*) AS booking_count
      FROM bookings b
      GROUP BY b.teacher_id
    ) AS bookings ON bookings.teacher_id = u.id
    WHERE u.role = 'teacher' AND t.verification_status = 'approved'
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, (err, results) => {
      if (err) return reject(err);
      resolve(results || []);
    });
  });
};

export const rankMentors = async ({ queryTags = [], limit = 10 } = {}) => {
  const teachers = await fetchTeacherMetrics();
  const normalizedQueryTags = extractTags(queryTags);
  const queryTagSet = new Set(normalizedQueryTags);

  const maxEnrollmentCount = teachers.reduce(
    (max, teacher) => Math.max(max, Number(teacher.enrollment_count) || 0),
    0
  );
  const maxBookingCount = teachers.reduce(
    (max, teacher) => Math.max(max, Number(teacher.booking_count) || 0),
    0
  );

  const scoredMentors = teachers.map((teacher) => {
    const teacherTags = extractTags(teacher.expertise_tags);
    const matchedTags = teacherTags.filter((tag) => queryTagSet.has(tag));
    const skillScore = queryTagSet.size
      ? matchedTags.length / queryTagSet.size
      : 0;

    const enrollmentScore = maxEnrollmentCount
      ? (Number(teacher.enrollment_count) || 0) / maxEnrollmentCount
      : 0;
    const bookingScore = maxBookingCount
      ? (Number(teacher.booking_count) || 0) / maxBookingCount
      : 0;
    const qualityScore = (enrollmentScore + bookingScore) / 2;

    const overallScore = skillScore * 0.7 + qualityScore * 0.3;

    return {
      ...teacher,
      matched_tags: matchedTags,
      skill_score: Number(skillScore.toFixed(3)),
      quality_score: Number(qualityScore.toFixed(3)),
      overall_score: Number(overallScore.toFixed(3)),
    };
  });

  return scoredMentors
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, limit);
};