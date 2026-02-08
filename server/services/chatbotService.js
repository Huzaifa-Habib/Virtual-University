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

    const fetchCoursesWithPricing = () => {
  const sql = `
    SELECT
      c.id,
      c.title,
      c.description,
      u.name AS teacher_name,
      MIN(cp.price) AS min_price
    FROM courses c
    LEFT JOIN users u ON c.teacher_id = u.id
    LEFT JOIN course_packages cp ON cp.course_id = c.id
    GROUP BY c.id, c.title, c.description, u.name
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, (err, results) => {
      if (err) return reject(err);
      resolve(results || []);
    });
  });
};

const sanitizeTokens = (prompt) =>
  String(prompt || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);

    const STOP_WORDS = new Set([
  "which",
  "what",
  "best",
  "mentor",
  "mentors",
  "teacher",
  "teachers",
  "course",
  "courses",
  "with",
  "under",
  "about",
  "find",
  "need",
  "want",
  "high",
  "demand",
  "tech",
  "price",
  "pricing",
  "budget",
  "learn",
  "learning",
  "recommend",
  "suggest",
  "student",
  "students",
  "program",
  "track",
  "for",
  "the",
  "and",
  "your",
  "can",
  "you",
]);

const extractQueryTagsFromPrompt = (prompt) => {
  const tokens = sanitizeTokens(prompt);
  return tokens.filter((token) => !STOP_WORDS.has(token));
};

const isMentorQuery = (prompt) =>
  /(mentor|teacher|instructor|coach)/i.test(String(prompt || ""));


const extractBudget = (prompt) => {
  const match = String(prompt || "").match(/(\d{2,6})/);
  return match ? Number(match[1]) : null;
};

export const buildChatbotInsights = async ({ prompt }) => {
  const courses = await fetchCoursesWithPricing();
  const tokens = sanitizeTokens(prompt);
  const budget = extractBudget(prompt);
  const queryTags = extractQueryTagsFromPrompt(prompt);

  const scoredCourses = courses.map((course) => {
    const haystack = `${course.title || ""} ${course.description || ""}`.toLowerCase();
    const matchCount = tokens.reduce(
      (count, token) => (haystack.includes(token) ? count + 1 : count),
      0
    );
    const priceValue = Number(course.min_price) || 0;
    const budgetScore = budget && priceValue ? (priceValue <= budget ? 1 : -1) : 0;
    const score = matchCount * 2 + budgetScore;

    return {
      ...course,
      score,
      priceValue,
    };
  });

  const filteredCourses = budget
    ? scoredCourses.filter((course) => course.priceValue && course.priceValue <= budget)
    : scoredCourses;

  const rankedCourses = (filteredCourses.length ? filteredCourses : scoredCourses)
    .sort((a, b) => b.score - a.score || a.priceValue - b.priceValue)
    .slice(0, 3);

  const topCourseNames = rankedCourses.map((course) => course.title).filter(Boolean);
  const topCoursesText = topCourseNames.length
    ? topCourseNames.join(", ")
    : "Share your goals to see the best match.";

  const bestPriceCourse = rankedCourses
    .filter((course) => course.priceValue)
    .sort((a, b) => a.priceValue - b.priceValue)[0];

  const bestPricingText = bestPriceCourse
    ? `${bestPriceCourse.title} starts at $${bestPriceCourse.priceValue}.`
    : "Ask about budgets and subscription options.";

  let bestMentorText = rankedCourses[0]?.teacher_name
    ? `Consider ${rankedCourses[0].teacher_name} for ${rankedCourses[0].title}.`
    : "We connect you with mentors aligned to goals.";
    let mentorReply = "";

  if (isMentorQuery(prompt) || queryTags.length) {
    const rankedMentors = await rankMentors({ queryTags, limit: 3 });
    if (rankedMentors.length) {
      const topMentor = rankedMentors[0];
      const tagText = topMentor.matched_tags?.length
        ? ` (${topMentor.matched_tags.join(", ")})`
        : "";
      bestMentorText = `Top mentor: ${topMentor.name}${tagText}.`;
      mentorReply = `I recommend ${topMentor.name}${tagText} based on mentor performance and expertise.`;
    } else {
      bestMentorText = "We are onboarding more mentors for that specialty.";
    }
  }

  const futureScopeText = topCourseNames.length
    ? `Roles tied to ${topCourseNames[0]} show strong hiring demand this semester.`
    : "We highlight demand, growth, and career tracks.";

  const reply = mentorReply
    ? mentorReply
    : topCourseNames.length
      ? `Based on your goals, I recommend ${topCourseNames.join(", ")}.`
      : "Tell me your interest area, budget, and timeline so I can recommend courses.";

  return {
    reply,
    topCourses: topCoursesText,
    futureScope: futureScopeText,
    bestPricing: bestPricingText,
    bestMentor: bestMentorText,
  };
};

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