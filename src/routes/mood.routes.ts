import { Router } from "express";
import { authenticateToken } from "../middlewares/auth.middleware";
import { moodController } from "../controllers/mood.controller";

const router = Router();

router.use(authenticateToken); // Protect all routes

router.get("/detect", moodController.detectMood);
router.post("/suggest", moodController.suggestMood);

export default router;
