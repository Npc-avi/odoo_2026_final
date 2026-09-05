import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const quotationsApi = axios.create({
  baseURL: `${BASE_URL}/quotations`,
  withCredentials: true,
});

export const negotiationsApi = axios.create({
  baseURL: `${BASE_URL}/negotiations`,
  withCredentials: true,
});

// ==========================================
// Staff Quotation Management Endpoints
// ==========================================

export async function fetchQuotationsApi() {
  try {
    const res = await quotationsApi.get('/');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch quotations.' };
  }
}

export async function fetchQuotationByIdApi(id: string) {
  try {
    const res = await quotationsApi.get(`/${id}`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: `Failed to fetch quotation ${id}.` };
  }
}

export async function fetchCustomersApi() {
  try {
    const res = await quotationsApi.get('/customers');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch customer directory.' };
  }
}

export async function createQuotationApi(payload: {
  customerId: string;
  promisedDeliveryDate?: string;
  status?: string;
}) {
  try {
    const res = await quotationsApi.post('/', payload);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to create quotation draft.' };
  }
}

export async function submitQuotationForApprovalApi(quotationId: string) {
  try {
    const res = await quotationsApi.post(`/${quotationId}/submit-approval`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to submit quotation for approval.' };
  }
}

export async function addItemToQuotationApi(
  quotationId: string,
  itemData: {
    productId: string;
    variantId?: string | null;
    lineType: 'hardware' | 'service' | 'subscription';
    quantity: number;
    appliedDiscountPct?: number;
    lineNotes?: string;
  }
) {
  try {
    const res = await quotationsApi.post(`/${quotationId}/items`, itemData);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to add item to quotation.' };
  }
}

export async function updateQuotationItemApi(
  itemId: string,
  updateData: {
    quantity?: number;
    appliedDiscountPct?: number;
    variantId?: string | null;
    lineNotes?: string;
  }
) {
  try {
    const res = await quotationsApi.patch(`/items/${itemId}`, updateData);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to update quotation item.' };
  }
}

export async function deleteQuotationItemApi(itemId: string) {
  try {
    const res = await quotationsApi.delete(`/items/${itemId}`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to delete quotation item.' };
  }
}

export async function fetchUpsellsApi(quotationId: string) {
  try {
    const res = await quotationsApi.get(`/${quotationId}/upsells`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch upsell recommendations.' };
  }
}

export async function sendQuotationApi(quotationId: string) {
  try {
    const res = await quotationsApi.post(`/${quotationId}/send`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to send quotation to Customer Portal.' };
  }
}

// ==========================================
// Customer Portal Endpoints
// ==========================================

export async function fetchCustomerQuotationsApi() {
  try {
    const res = await quotationsApi.get('/portal/my-quotations');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch portal quotations.' };
  }
}

export async function fetchCustomerQuotationDetailApi(id: string) {
  try {
    const res = await quotationsApi.get(`/portal/${id}`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch quotation details.' };
  }
}

// ==========================================
// In-Line Negotiation & 1-Click Confirmation
// ==========================================

export async function fetchNegotiationThreadApi(quotationId: string, isPortal = false) {
  try {
    const endpoint = isPortal ? `/portal/${quotationId}` : `/${quotationId}`;
    const res = await negotiationsApi.get(endpoint);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to load negotiation thread.' };
  }
}

export async function submitNegotiationMessageApi(
  quotationId: string,
  payload: {
    quotationItemId?: string | null;
    proposedDiscountPct?: number | null;
    requestedDeliveryDate?: string;
    comments: string;
  },
  isPortal = false
) {
  try {
    const endpoint = isPortal ? `/portal/${quotationId}` : `/${quotationId}`;
    const res = await negotiationsApi.post(endpoint, payload);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to submit negotiation comment.' };
  }
}

export async function confirmCustomerQuotationApi(quotationId: string) {
  try {
    const res = await negotiationsApi.post(`/portal/${quotationId}/confirm`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to confirm quotation.' };
  }
}

// ==========================================
// Customer Portal Line-Item Negotiation
// ==========================================

export async function fetchPortalCatalogApi() {
  try {
    const res = await axios.get(`${BASE_URL}/catalog/portal`, { withCredentials: true });
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch catalog.' };
  }
}

export async function addPortalQuotationItemApi(
  quotationId: string,
  itemData: {
    productId: string;
    variantId?: string | null;
    lineType: 'hardware' | 'service' | 'subscription';
    quantity: number;
    appliedDiscountPct?: number;
    lineNotes?: string;
  }
) {
  try {
    const res = await quotationsApi.post(`/portal/${quotationId}/items`, itemData);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to add item to proposal.' };
  }
}

export async function updatePortalQuotationItemApi(
  itemId: string,
  updateData: {
    quantity?: number;
    appliedDiscountPct?: number;
    variantId?: string | null;
    lineNotes?: string;
  }
) {
  try {
    const res = await quotationsApi.patch(`/portal/items/${itemId}`, updateData);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to update proposal item.' };
  }
}

export async function deletePortalQuotationItemApi(itemId: string) {
  try {
    const res = await quotationsApi.delete(`/portal/items/${itemId}`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to remove proposal item.' };
  }
}

