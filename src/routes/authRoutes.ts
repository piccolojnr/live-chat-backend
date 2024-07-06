import { Router } from 'express';
import AuthController from '../controllers/authController';

const router = Router();

router.post('/connect', AuthController.getConnect);
router.get('/auth', AuthController.auth);
router.post('/disconnect', AuthController.getDisconnect);

export default router;
