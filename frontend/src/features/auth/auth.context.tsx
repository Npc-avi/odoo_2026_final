import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  getStaffMeApi,
  getPortalMeApi,
  loginStaffApi,
  loginPortalApi,
  registerCompanyApi,
  RegisterCompanyPayload,
  logoutStaffApi,
  logoutPortalApi
} from './services/auth.api';

export type UserRole = 'admin' | 'sales_manager' | 'sales_rep' | 'finance' | 'customer_portal';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  tenantId?: string;
  tenantName?: string;
  customerId?: string;
  companyName?: string;
  customerTier?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  checkingAuth: boolean;
  loginStaff: (creds: { email: string; password: string }) => Promise<void>;
  loginPortal: (creds: { email: string; password: string }) => Promise<void>;
  registerCompany: (payload: RegisterCompanyPayload) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  const checkSession = useCallback(async () => {
    setCheckingAuth(true);
    try {
      // 1. Try staff session first
      try {
        const staffData = await getStaffMeApi();
        if (staffData?.user) {
          setUser({
            ...staffData.user,
            role: staffData.user.role as UserRole
          });
          setCheckingAuth(false);
          return;
        }
      } catch (_) {
        // Staff check failed, try portal session
      }

      // 2. Try customer portal session
      try {
        const portalData = await getPortalMeApi();
        if (portalData?.portalUser) {
          setUser({
            id: portalData.portalUser.id,
            email: portalData.portalUser.email,
            role: 'customer_portal',
            fullName: portalData.portalUser.contactName,
            companyName: portalData.portalUser.companyName,
            customerId: portalData.portalUser.customerId,
            tenantId: portalData.portalUser.tenantId,
            tenantName: portalData.portalUser.tenantName,
            customerTier: portalData.portalUser.customerTier
          });
          setCheckingAuth(false);
          return;
        }
      } catch (_) {}

      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const loginStaff = async (creds: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await loginStaffApi(creds);
      if (res.user) {
        setUser({
          ...res.user,
          role: res.user.role as UserRole
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loginPortal = async (creds: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await loginPortalApi(creds);
      if (res.portalUser) {
        setUser({
          id: res.portalUser.id,
          email: res.portalUser.email,
          role: 'customer_portal',
          fullName: res.portalUser.contactName,
          companyName: res.portalUser.companyName,
          customerId: res.portalUser.customerId,
          tenantId: res.portalUser.tenantId,
          tenantName: res.portalUser.tenantName,
          customerTier: res.portalUser.customerTier
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const registerCompany = async (payload: RegisterCompanyPayload) => {
    setLoading(true);
    try {
      const res = await registerCompanyApi(payload);
      if (res.user) {
        setUser({
          id: res.user.id,
          email: res.user.email,
          role: res.user.role as UserRole,
          fullName: res.user.fullName,
          tenantId: res.user.tenantId,
          tenantName: res.user.tenantName,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (user?.role === 'customer_portal') {
        await logoutPortalApi();
      } else {
        await logoutStaffApi();
      }
    } catch (_) {
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        checkingAuth,
        loginStaff,
        loginPortal,
        registerCompany,
        logout,
        checkSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
