import { withTenantContext } from '../middleware/tenant-context.middleware.js';
import {
  getQuotationsStaff,
  getQuotationDetailStaff,
  createQuotationDraft,
  addQuotationItem,
  updateQuotationItem,
  deleteQuotationItem,
  getUpsellRecommendations,
  getPortalQuotationDetail,
  getPortalQuotationsList,
  getCustomersStaff,
  sendQuotationStaff,
  submitQuotationForApprovalStaff
} from '../repository/quotation.repository.js';

/**
 * Staff: List all quotations for tenant
 */
export async function listQuotations(req, res, next) {
  try {
    const quotations = await withTenantContext(req.actor, async (client) => {
      return getQuotationsStaff(client);
    });
    return res.status(200).json({ quotations });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: Get complete quotation detail with lines and upsells
 */
export async function getQuotation(req, res, next) {
  try {
    const { id } = req.params;
    const quotation = await withTenantContext(req.actor, async (client) => {
      return getQuotationDetailStaff(client, id);
    });

    if (!quotation) {
      const err = new Error('Quotation not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({ quotation });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: Create a new draft quotation
 */
export async function createQuotation(req, res, next) {
  try {
    const quote = await withTenantContext(req.actor, async (client) => {
      return createQuotationDraft(client, req.actor.tenantId, req.actor.userId, req.body);
    });
    return res.status(201).json({ quotation: quote });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: Add line item to quotation
 * Automatically synchronizes line totals, margins, and blended risk score via DB triggers
 */
export async function addItem(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const result = await withTenantContext(req.actor, async (client) => {
      return addQuotationItem(client, req.actor.tenantId, id, req.body);
    });

    return res.status(201).json({
      message: 'Item added to quotation.',
      item: result.item,
      quotationSummary: result.quotationSummary
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: Update line item quantity, discount, or variant
 * Automatically re-evaluates governance approval routing and returns updated status
 */
export async function editItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const result = await withTenantContext(req.actor, async (client) => {
      return updateQuotationItem(client, itemId, req.body);
    });

    if (!result) {
      const err = new Error('Quotation item not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      message: 'Quotation item updated.',
      item: result.item,
      quotationSummary: result.quotationSummary
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: Delete line item from quotation
 */
export async function removeItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const result = await withTenantContext(req.actor, async (client) => {
      return deleteQuotationItem(client, itemId);
    });

    if (!result) {
      const err = new Error('Quotation item not found.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      message: 'Item removed from quotation.',
      deletedItemId: result.deletedItemId,
      quotationSummary: result.quotationSummary
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: Get upsell / cross-sell recommendations with margin deltas
 */
export async function getUpsells(req, res, next) {
  try {
    const { id } = req.params; // quotation_id
    const suggestions = await withTenantContext(req.actor, async (client) => {
      return getUpsellRecommendations(client, id);
    });
    return res.status(200).json({ suggestions });
  } catch (err) {
    next(err);
  }
}

/**
 * Customer Portal: List customer's own quotations (via safe view)
 */
export async function listCustomerQuotations(req, res, next) {
  try {
    const quotations = await withTenantContext(req.actor, async (client) => {
      return getPortalQuotationsList(client);
    });
    return res.status(200).json({ quotations });
  } catch (err) {
    next(err);
  }
}

/**
 * Customer Portal: Get quotation detail (via safe view - internal costs/margins completely excluded)
 */
export async function getCustomerQuotation(req, res, next) {
  try {
    const { id } = req.params;
    const quotation = await withTenantContext(req.actor, async (client) => {
      return getPortalQuotationDetail(client, id);
    });

    if (!quotation) {
      const err = new Error('Quotation not found or not currently available for customer review.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({ quotation });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: List all active customers and their tier discount ceiling
 */
export async function listCustomers(req, res, next) {
  try {
    const customers = await withTenantContext(req.actor, async (client) => {
      return getCustomersStaff(client);
    });
    return res.status(200).json({ customers });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: Send quotation to Customer Portal
 */
export async function sendQuotation(req, res, next) {
  try {
    const { id } = req.params;
    const updatedQuote = await withTenantContext(req.actor, async (client) => {
      return sendQuotationStaff(client, id);
    });

    if (!updatedQuote) {
      const err = new Error('Quotation cannot be sent. It must be in draft or approved status without pending approval locks.');
      err.status = 400;
      return next(err);
    }

    return res.status(200).json({
      message: 'Quotation sent to Customer Portal.',
      quotation: updatedQuote
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Staff: Explicitly submit quotation for approval
 */
export async function submitQuotationApproval(req, res, next) {
  try {
    const { id } = req.params;
    const updatedQuote = await withTenantContext(req.actor, async (client) => {
      return submitQuotationForApprovalStaff(client, id);
    });

    if (!updatedQuote) {
      const err = new Error('Quotation could not be submitted for approval.');
      err.status = 404;
      return next(err);
    }

    return res.status(200).json({
      message: 'Quotation submitted for approval successfully.',
      quotation: updatedQuote
    });
  } catch (err) {
    next(err);
  }
}

