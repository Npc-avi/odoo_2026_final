import { Router } from 'express';
import {
  registerStaff,
  loginStaff,
  getStaffMe,
  logoutStaff
} from '../controller/auth.controller.js';
import {
  validateStaffRegister,
  validateStaffLogin
} from '../validation/auth.validator.js';
import { verifyStaffToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', validateStaffRegister, registerStaff);
router.post('/login', validateStaffLogin, loginStaff);
router.post('/logout', logoutStaff);
router.get('/me', verifyStaffToken, getStaffMe);

export default router;
