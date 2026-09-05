/**
 * Hand-written Validation Middlewares for Staff and Customer Portal Authentication
 */

export function validateStaffRegister(req, res, next) {
  const { tenantId, email, password, fullName, role } = req.body;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Validation Error', message: 'Valid tenantId UUID is required.' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Validation Error', message: 'Valid email address is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Validation Error', message: 'Password must be at least 6 characters.' });
  }
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
    return res.status(400).json({ error: 'Validation Error', message: 'Full name is required.' });
  }
  const validRoles = ['admin', 'sales_manager', 'sales_rep', 'finance'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Validation Error', message: `Role must be one of: ${validRoles.join(', ')}.` });
  }

  next();
}

export function validateStaffLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Validation Error', message: 'Valid email address is required.' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Validation Error', message: 'Password is required.' });
  }

  next();
}

export function validatePortalLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Validation Error', message: 'Valid email address is required.' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Validation Error', message: 'Password is required.' });
  }

  next();
}

export function validateMagicLinkRequest(req, res, next) {
  const { email } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Validation Error', message: 'Valid email address is required.' });
  }

  next();
}

export function validateMagicLinkVerify(req, res, next) {
  const { token } = req.query;

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return res.status(400).json({ error: 'Validation Error', message: 'Magic link verification token is required.' });
  }

  next();
}

export function validateCompanyRegister(req, res, next) {
  const { companyName, email, password, fullName } = req.body;

  if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
    return res.status(400).json({ error: 'Validation Error', message: 'Company name must be at least 2 characters.' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Validation Error', message: 'Valid administrator work email address is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Validation Error', message: 'Password must be at least 6 characters.' });
  }
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Validation Error', message: 'Administrator full name is required.' });
  }

  next();
}
