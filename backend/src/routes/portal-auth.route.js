import { Router } from 'express';
import {
  loginPortal,
  requestMagicLink,
  verifyMagicLink,
  getPortalMe,
  logoutPortal
} from '../controller/portal-auth.controller.js';
import {
  validatePortalLogin,
  validateMagicLinkRequest,
  validateMagicLinkVerify
} from '../validation/auth.validator.js';
import { verifyPortalToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', validatePortalLogin, loginPortal);
router.post('/request-link', validateMagicLinkRequest, requestMagicLink);
router.get('/verify', validateMagicLinkVerify, verifyMagicLink);
router.post('/logout', logoutPortal);
router.get('/me', verifyPortalToken, getPortalMe);

export default router;
