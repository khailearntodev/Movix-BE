import express from "express"
import {adminGamificationController} from "../controllers/admin.gamification.controller"

const router = express.Router();

//Get /api/admin/gamification/get-system-ranks
router.get("/get-system-ranks", adminGamificationController.getSystemRanks);

//Put /api/admin/gamification/update-system-rank
router.put("/update-system-rank", adminGamificationController.updateSystemRank);

export default router;
