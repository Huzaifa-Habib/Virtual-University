import express from "express";
import { getChatbotInsights, getMentorRecommendations } from "../controllers/chatbotController.js";
import { protect, requireRole } from "../middlewares/authMiddleware.js";
const router = express.Router();
// POST /api/chatbot
router.post("/", protect, requireRole("student"), getChatbotInsights);

// POST /api/chatbot/mentors
router.post("/mentors", protect, requireRole("student"), getMentorRecommendations);

export default router;