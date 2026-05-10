import { Router } from "express";
import { getAllBlogsController, updateBlogStatusController, getBlogDetailController } from "../controllers/admin.blog.controller";

const router = Router();

//Get all blogs
router.get("/get-all", getAllBlogsController);
//Get blog detail
router.get("/get-blog/:id", getBlogDetailController);
//Update blog status
router.put("/update-blog-status/:id", updateBlogStatusController);

export default router;