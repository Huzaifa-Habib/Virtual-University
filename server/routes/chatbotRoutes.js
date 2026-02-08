import express from "express";
import { getMentorRecommendations } from "../controllers/chatbotController.js";

const router = express.Router();

// POST /api/chatbot/mentors
router.post("/mentors", getMentorRecommendations);

export default router;