import axios from 'axios';
import { quotationsApi } from '@/features/quotations/services/quotations.api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const fulfillmentApi = axios.create({
  baseURL: `${BASE_URL}/fulfillment`,
  withCredentials: true,
});

export async function fetchWarehousesApi() {
  try {
    const res = await fulfillmentApi.get('/warehouses');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch warehouses.' };
  }
}

export async function fetchInventoryApi() {
  try {
    const res = await fulfillmentApi.get('/inventory');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch inventory.' };
  }
}

export async function updateStockApi(warehouseId: string, productId: string, qtyOnHand: number) {
  try {
    const res = await fulfillmentApi.patch('/inventory', { warehouseId, productId, qtyOnHand });
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to update stock.' };
  }
}

export async function fetchShipmentsApi() {
  return fetchConfirmedQuotationsApi();
}

export async function fetchConfirmedQuotationsApi() {
  try {
    const res = await quotationsApi.get('/');
    const all = res.data?.quotations || [];
    return all.filter((q: any) => ['confirmed', 'in_fulfillment', 'fulfillment', 'shipped', 'delivered'].includes(q.status));
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch confirmed orders.' };
  }
}

export async function suggestWarehouseSplitApi(quotationId: string) {
  try {
    const res = await fulfillmentApi.get(`/quotations/${quotationId}/suggest-split`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to generate split suggestion.' };
  }
}

export async function confirmSplitDispatchApi(
  quotationId: string,
  splitPayload: {
    splits: Array<{
      warehouseId: string;
      items: Array<{ quotationItemId: string; fulfilledQty: number }>;
    }>;
    isManualOverride?: boolean;
  }
) {
  try {
    const res = await fulfillmentApi.post(`/quotations/${quotationId}/confirm-split`, splitPayload);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to confirm dispatch split.' };
  }
}

export async function fetchQuotationShipmentsApi(quotationId: string) {
  try {
    const res = await fulfillmentApi.get(`/quotations/${quotationId}/shipments`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch shipments.' };
  }
}
