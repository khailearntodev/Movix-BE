import { Router } from "express";
import { countryController } from "../controllers/country.controller";

const router = Router();

// GET /api/countries - Lấy danh sách
router.get("/", countryController.getAllCountries); 

// POST /api/countries - Tạo mới (Chỉ Admin)
router.post("/", countryController.createCountry);

// PUT /api/countries/:id - Cập nhật (Chỉ Admin)
router.put("/:id", countryController.updateCountry);

// DELETE /api/countries/:id - Xóa (Chỉ Admin)
router.delete("/:id", countryController.deleteCountry);

export default router;