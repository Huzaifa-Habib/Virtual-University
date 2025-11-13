import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";
import { createVideoRoom, getJoinToken } from "../controllers/videoController.js";

const router = express.Router();

// teacher creates room after accepting
router.post("/:bookingId/create", protect, allowRoles("teacher"), createVideoRoom);

// teacher/student request join token
router.get("/:bookingId/join", protect, allowRoles("teacher", "student"), getJoinToken);

export default router;
