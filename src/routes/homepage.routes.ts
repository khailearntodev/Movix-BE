import { Router } from 'express';
import { homepageController } from '../controllers/homepage.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', homepageController.getAll);
router.post('/', homepageController.create);
router.put('/reorder', homepageController.reorderSections); 
router.put('/movies/reorder', homepageController.reorderMovies); 
router.put('/:id', homepageController.update);
router.delete('/:id', homepageController.delete);

router.post('/movie', homepageController.addMovie);
router.delete('/:sectionId/movie/:linkId', homepageController.removeMovie);

export default router;