/**
 * Central Error-Handling Middleware
 * Translates PostgreSQL codes, RLS rejections, and business failures into clean HTTP responses.
 */
export function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';

  // 1. PostgreSQL Specific Error Code Handling
  if (err.code) {
    switch (err.code) {
      // 23505: Unique Constraint Violation
      case '23505': {
        const detail = err.detail || '';
        let message = 'A record with this identifier already exists.';
        if (err.constraint) {
          if (err.constraint.includes('sku')) message = 'A product with this SKU already exists in this tenant catalog.';
          else if (err.constraint.includes('email')) message = 'An account with this email address already exists.';
          else if (err.constraint.includes('quote_code')) message = 'A quotation with this quotation code already exists.';
          else if (err.constraint.includes('warehouse_code')) message = 'A warehouse with this code already exists.';
          else if (err.constraint.includes('tier_category')) message = 'A discount governance rule already exists for this tier and category.';
        }
        return res.status(409).json({
          error: 'Conflict',
          message,
          detail: isDev ? detail : undefined
        });
      }

      // 23P01: Range Exclusion Constraint Violation
      case '23P01': {
        return res.status(400).json({
          error: 'Invalid Range',
          message: 'This discount range overlaps an existing approval-chain rule for this customer tier.'
        });
      }

      // 42501: Insufficient Privilege / RLS Policy Rejection
      case '42501': {
        console.error('[SECURITY ALERT] 42501 Insufficient Privilege / RLS Denial:', {
          path: req.originalUrl,
          method: req.method,
          actor: req.actor,
          error: err.message
        });
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You do not have permission to view or modify this tenant resource.'
        });
      }

      // 23503: Foreign Key Violation
      case '23503': {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Referenced entity does not exist or cannot be modified.',
          detail: isDev ? err.detail : undefined
        });
      }

      // 23514: Check Constraint Violation
      case '23514': {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Data constraint validation failed: ' + (err.detail || err.message)
        });
      }

      default:
        break;
    }
  }

  // 2. Standard Application / HTTP Errors
  const status = err.status || 500;
  const message = err.message || 'An internal server error occurred.';

  if (status >= 500) {
    console.error(`[Internal Server Error ${status}] ${req.method} ${req.originalUrl}:`, err);
  }

  return res.status(status).json({
    error: status === 404 ? 'Not Found' : status === 400 ? 'Bad Request' : status === 403 ? 'Forbidden' : 'Error',
    message,
    ...(isDev && { stack: err.stack })
  });
}
