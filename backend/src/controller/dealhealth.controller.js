import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import { getAlerts, markAlertResolved, updateAlertAction } from '../repository/dealhealth.repository.js';
import { triggerStalledDealCheck } from '../jobs/stalled-deal.job.js';

/**
 * List deal health alerts for tenant
 */
export async function listAlerts(req, res, next) {
  try {
    const alerts = await withTenantContext(req.actor, async (client) => {
      return getAlerts(client);
    });
    return res.status(200).json({ alerts });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark a deal health alert as resolved
 */
export async function resolveAlert(req, res, next) {
  try {
    const { id } = req.params;
    const alert = await withTenantContext(req.actor, async (client) => {
      return markAlertResolved(client, id);
    });

    if (!alert) {
      const err = new Error('Alert not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      message: 'Alert marked as resolved.',
      alert
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Record action taken on a deal health alert (e.g. 'Nudge sent', 'Escalated to Manager')
 */
export async function updateAction(req, res, next) {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const alert = await withTenantContext(req.actor, async (client) => {
      return updateAlertAction(client, id, action);
    });

    if (!alert) {
      const err = new Error('Alert not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      message: 'Action recorded successfully.',
      alert
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Manually trigger stalled deal sweep (calls stored procedure)
 */
export async function triggerStalledCheck(req, res, next) {
  try {
    const idleDays = req.body.idleDays ? parseInt(req.body.idleDays, 10) : 3;
    await triggerStalledDealCheck(idleDays);
    return res.status(200).json({ message: `Stalled deal check completed for deals idle > ${idleDays} days.` });
  } catch (err) {
    next(err);
  }
}
