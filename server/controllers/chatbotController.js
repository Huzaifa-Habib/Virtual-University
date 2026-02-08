import { rankMentors } from "../services/chatbotService.js";

export const getMentorRecommendations = async (req, res) => {
  try {
    const { tags, limit } = req.body || {};
    const queryTags = Array.isArray(tags)
      ? tags
      : typeof tags === "string"
        ? tags.split(",")
        : [];
    const cappedLimit = Number.isFinite(Number(limit))
      ? Math.max(1, Math.min(50, Number(limit)))
      : 10;

    const mentors = await rankMentors({ queryTags, limit: cappedLimit });
    res.json({ mentors });
  } catch (error) {
    console.error("Error ranking mentors:", error);
    res.status(500).json({ message: "Failed to rank mentors" });
  }
};