import { Router } from 'express';
import { genreController } from '../controllers/genre.controller';

const router = Router();
router.get('/', genreController.getAllGenres);

router.post("/", genreController.createGenre);
router.put("/:id", genreController.updateGenre);
router.delete("/:id", genreController.deleteGenre);

export default router;