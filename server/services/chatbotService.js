import { db } from "../config/db.js";

const DEFAULT_WEIGHTS = {
  tagMatch: 0.4,
  priceFit: 0.2,
  demand: 0.2,
  mentorStrength: 0.2,
};

const normalizeText = (value) => {
  if (!value) return [];
  const text = Array.isArray(value) ? value.join(" ") : String(value);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

const uniqueTokens = (...collections) => {
  const tokens = collections.flatMap((item) => normalizeText(item));
  return Array.from(new Set(tokens));
};

const intersectionCount = (a, b) => {
  const setB = new Set(b);
  return a.filter((token) => setB.has(token)).length;
};

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

const scoreTagMatch = (keywords, courseTokens) => {
  if (!keywords.length || !courseTokens.length) return 0;
  const matches = intersectionCount(keywords, courseTokens);
  return clamp(matches / keywords.length);
};

const scorePriceFit = (budget, minPrice) => {
  if (!budget || !minPrice) return 0.5;
  if (minPrice <= budget) return 1;
  return clamp(1 - (minPrice - budget) / budget);
};

const scoreDemand = (marketDemandScore) => {
  if (marketDemandScore === null || marketDemandScore === undefined) return 0.5;
  return clamp(Number(marketDemandScore) / 100);
};

const scoreMentorStrength = ({
  verificationStatus,
  enrollmentCount,
  feedbackRating,
}) => {
  const verificationScore = verificationStatus === "approved" ? 1 : 0.4;
  const enrollmentScore = clamp(Math.log10((enrollmentCount || 0) + 1));
  const ratingScore = feedbackRating ? clamp(feedbackRating / 5) : 0.5;
  return clamp(verificationScore * 0.4 + enrollmentScore * 0.3 + ratingScore * 0.3);
};

const scoreMentorSkillMatch = (preferredMentorSkills, mentorTags) => {
  const mentorKeywords = uniqueTokens(mentorTags);
  const desiredKeywords = uniqueTokens(preferredMentorSkills);
  if (!mentorKeywords.length || !desiredKeywords.length) return 0;
  const matches = intersectionCount(desiredKeywords, mentorKeywords);
  return clamp(matches / desiredKeywords.length);
};

const fetchCourseData = () =>
  new Promise((resolve, reject) => {
    const query = `
      SELECT
        c.id,
        c.title,
        c.description,
        c.teacher_id,
        t.expertise_tags,
        t.verification_status,
        MIN(cp.price) AS min_price,
        ci.market_demand_score,
        ci.recommended_for,
        COUNT(DISTINCT e.id) AS enrollment_count,
        AVG(f.rating) AS feedback_rating
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.user_id
      LEFT JOIN course_packages cp ON cp.course_id = c.id
      LEFT JOIN course_insights ci ON ci.course_id = c.id
      LEFT JOIN enrollments e ON e.course_id = c.id
      LEFT JOIN feedback f ON f.course_id = c.id
      GROUP BY
        c.id,
        c.title,
        c.description,
        c.teacher_id,
        t.expertise_tags,
        t.verification_status,
        ci.market_demand_score,
        ci.recommended_for
    `;

    db.query(query, (err, results) => {
      if (err) return reject(err);
      resolve(results || []);
    });
  });

export const getChatbotRecommendations = async (userQuery, preferences = {}) => {
  const {
    interests = [],
    budget = null,
    level = "",
    preferredMentorSkills = [],
    weights = {},
    limit = 5,
  } = preferences;

  const resolvedWeights = { ...DEFAULT_WEIGHTS, ...weights };
  const keywordPool = uniqueTokens(userQuery, interests, level, preferredMentorSkills);

  const courses = await fetchCourseData();

  const scoredCourses = courses.map((course) => {
    const courseTokens = uniqueTokens(
      course.title,
      course.description,
      course.expertise_tags,
      course.recommended_for
    );

    const tagScore = scoreTagMatch(keywordPool, courseTokens);
    const priceScore = scorePriceFit(budget, Number(course.min_price));
    const demandScore = scoreDemand(course.market_demand_score);
    const mentorStrengthScore = scoreMentorStrength({
      verificationStatus: course.verification_status,
      enrollmentCount: Number(course.enrollment_count),
      feedbackRating: course.feedback_rating ? Number(course.feedback_rating) : null,
    });

    const totalScore =
      tagScore * resolvedWeights.tagMatch +
      priceScore * resolvedWeights.priceFit +
      demandScore * resolvedWeights.demand +
      mentorStrengthScore * resolvedWeights.mentorStrength;

    const mentorSkillScore = scoreMentorSkillMatch(
      preferredMentorSkills,
      course.expertise_tags
    );

    return {
      ...course,
      min_price: course.min_price ? Number(course.min_price) : null,
      enrollment_count: Number(course.enrollment_count) || 0,
      feedback_rating: course.feedback_rating ? Number(course.feedback_rating) : null,
      scores: {
        tagScore,
        priceScore,
        demandScore,
        mentorStrengthScore,
        mentorSkillScore,
        totalScore: clamp(totalScore),
      },
    };
  });

  const rankedCourses = scoredCourses
    .slice()
    .sort((a, b) => b.scores.totalScore - a.scores.totalScore);

  const topRecommendations = rankedCourses.slice(0, Math.max(3, Math.min(limit, 5)));

  const budgetEligible = rankedCourses.filter((course) => {
    if (!course.min_price) return false;
    if (!budget) return true;
    return course.min_price <= budget;
  });

  const bestValueCourse = budgetEligible
    .slice()
    .sort((a, b) => {
      if (a.min_price === b.min_price) {
        return b.scores.totalScore - a.scores.totalScore;
      }
      return a.min_price - b.min_price;
    })[0];

  const bestMentorSuggestions = rankedCourses
    .slice()
    .sort((a, b) => {
      const scoreA = a.scores.mentorSkillScore * 0.6 + a.scores.mentorStrengthScore * 0.4;
      const scoreB = b.scores.mentorSkillScore * 0.6 + b.scores.mentorStrengthScore * 0.4;
      return scoreB - scoreA;
    })
    .slice(0, 3);

  return {
    topRecommendations,
    bestValueCourse: bestValueCourse || null,
    bestMentorSuggestions,
  };
};

export default {
  getChatbotRecommendations,
};