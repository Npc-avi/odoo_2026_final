import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const staffAuthApi = axios.create({
  baseURL: `${BASE_URL}/auth`,
  withCredentials: true,
});

export const portalAuthApi = axios.create({
  baseURL: `${BASE_URL}/portal/auth`,
  withCredentials: true,
});

export interface RegisterCompanyPayload {
  companyName: string;
  subdomain?: string;
  defaultCurrency?: string;
  fullName: string;
  email: string;
  password: string;
}

export async function registerCompanyApi(payload: RegisterCompanyPayload) {
  try {
    const res = await staffAuthApi.post('/register-company', payload);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to register company.' };
  }
}

export async function loginStaffApi(credentials: { email: string; password: string }) {
  try {
    const res = await staffAuthApi.post('/login', credentials);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to sign in as staff.' };
  }
}

export async function getStaffMeApi() {
  try {
    const res = await staffAuthApi.get('/me');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch staff session.' };
  }
}

export async function logoutStaffApi() {
  try {
    const res = await staffAuthApi.post('/logout');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to logout staff.' };
  }
}

export async function loginPortalApi(credentials: { email: string; password: string }) {
  try {
    const res = await portalAuthApi.post('/login', credentials);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to sign in to customer portal.' };
  }
}

export async function requestMagicLinkApi(email: string) {
  try {
    const res = await portalAuthApi.post('/request-link', { email });
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to request magic link.' };
  }
}

export async function verifyMagicLinkApi(token: string) {
  try {
    const res = await portalAuthApi.get(`/verify?token=${encodeURIComponent(token)}`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to verify magic link.' };
  }
}

export async function getPortalMeApi() {
  try {
    const res = await portalAuthApi.get('/me');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch customer session.' };
  }
}

export async function logoutPortalApi() {
  try {
    const res = await portalAuthApi.post('/logout');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to logout portal.' };
  }
}
