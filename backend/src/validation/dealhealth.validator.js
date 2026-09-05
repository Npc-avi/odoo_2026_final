/**
 * Hand-written Validation Middlewares for Deal Health Alerts
 */

export function validateResolveAlert(req, res, next) {
  // Alert ID from params is checked in controller
  next();
}
