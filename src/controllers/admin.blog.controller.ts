import { Response, Request } from "express";
import { getAllBlogs, updateBlogStatus, getBlogDetail } from "../services/admin.blog.service";

export const getAllBlogsController = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const take = Math.max(1, Number(req.query.take) || 10);
        const search = req.query.search as string;
        const status = req.query.status as string;
        
        const result = await getAllBlogs(page, take, search, status);
        return res.status(200).json({ result })
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
}

export const updateBlogStatusController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const result = await updateBlogStatus(id, status);
        return res.status(200).json({ result })
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
}

export const getBlogDetailController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await getBlogDetail(id);
        return res.status(200).json({ result })
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({ message: error.message });
    }
} 