import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const subscriptionApi = axios.create({
  baseURL: `${BASE_URL}/subscriptions`,
  withCredentials: true,
});

export async function fetchSubscriptionsApi() {
  try {
    const res = await subscriptionApi.get('/');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch subscriptions.' };
  }
}

export async function fetchSubscriptionDetailApi(id: string) {
  try {
    const res = await subscriptionApi.get(`/${id}`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch subscription detail.' };
  }
}

export async function updateSubscriptionStatusApi(id: string, status: string) {
  try {
    const res = await subscriptionApi.patch(`/${id}/status`, { status });
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to update subscription status.' };
  }
}

export async function cancelSubscriptionApi(id: string) {
  try {
    const res = await subscriptionApi.post(`/${id}/cancel`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to cancel subscription.' };
  }
}

export async function adjustSubscriptionSeatsApi(id: string, newQuantity: number) {
  try {
    const res = await subscriptionApi.patch(`/${id}/adjust`, { newQuantity });
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to adjust subscription seats.' };
  }
}

export async function fetchSubscriptionPlansApi() {
  try {
    const res = await subscriptionApi.get('/plans');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch subscription plans.' };
  }
}

export async function createSubscriptionPlanApi(data: any) {
  try {
    const res = await subscriptionApi.post('/plans', data);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to create subscription plan.' };
  }
}

export async function updateCustomerTierApi(customerId: string, tier: string) {
  try {
    const res = await subscriptionApi.patch(`/customer/${customerId}/tier`, { tier });
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to update customer tier.' };
  }
}

