import express from "express"
import {adminGamificationController} from "../controllers/admin.gamification.controller"

const router = express.Router();

//Get /api/admin/gamification/get-system-ranks
router.get("/get-system-ranks", adminGamificationController.getSystemRanks);

//Put /api/admin/gamification/update-system-rank
router.put("/update-system-rank", adminGamificationController.updateSystemRank);

//Get /api/admin/gamification/get-all-achievements
router.get("/get-all-achievements", adminGamificationController.getAllAchievements);

//Post /api/admin/gamification/create-achievement
router.post("/create-achievement", adminGamificationController.createAchievement);

//Put /api/admin/gamification/update-achievement/:id
router.put("/update-achievement/:id", adminGamificationController.updateAchievement);

//put /api/admin/gamification/toggle-achievement/:id
router.put("/toggle-achievement/:id", adminGamificationController.toggleAchievement);

//Get /api/admin/gamification/get-achievement/:userId
router.get("/get-achievement/:userId", adminGamificationController.getAchievementByUserId);

//post /api/admin/gamification/grant-xp/:userId
router.post("/grant-xp/:userId", adminGamificationController.grantXpToUser);

//post /api/admin/gamification/grant-achievement/:userId
router.post("/grant-achievement/:userId", adminGamificationController.grantAchievementToUser);

export default router;
