import { Router } from 'express';
import { countryController } from '../controllers/country.controller';

const router = Router();
router.get('/', countryController.getAllCountries);

export default router;