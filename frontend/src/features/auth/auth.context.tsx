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
  membershipStatus?: string;
  creditLimit?: number;
  accountOwnerName?: string;
  accountOwnerEmail?: string;
  subscription?: {
    id: string;
    status: string;
    planName: string;
    cadence: string;
    unitRecurringPrice: number;
    nextBillingDate: string;
    startDate: string;
  } | null;
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
      const isPortalRoute = window.location.pathname.startsWith('/portal');
      const activeMode = localStorage.getItem('dealflow_active_mode');
      const preferPortal = isPortalRoute || activeMode === 'portal';

      if (preferPortal) {
        // 1. Try customer portal session first
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
              customerTier: portalData.portalUser.customerTier,
              membershipStatus: portalData.portalUser.membershipStatus,
              creditLimit: portalData.portalUser.creditLimit,
              accountOwnerName: portalData.portalUser.accountOwnerName,
              accountOwnerEmail: portalData.portalUser.accountOwnerEmail,
              subscription: portalData.portalUser.subscription
            });
            setCheckingAuth(false);
            return;
          }
        } catch (_) {}

        // If on portal route or active mode is portal, do NOT fallback to staff session!
        if (isPortalRoute || activeMode === 'portal') {
          setUser(null);
          setCheckingAuth(false);
          return;
        }

        // Fallback to staff session only if not a portal route
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
        } catch (_) {}
      } else {
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
        } catch (_) {}

        // 2. Fallback to customer portal session
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
      }

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
      localStorage.setItem('dealflow_active_mode', 'staff');
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
      localStorage.setItem('dealflow_active_mode', 'portal');
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
          customerTier: res.portalUser.customerTier,
          membershipStatus: res.portalUser.membershipStatus,
          creditLimit: res.portalUser.creditLimit,
          accountOwnerName: res.portalUser.accountOwnerName,
          accountOwnerEmail: res.portalUser.accountOwnerEmail,
          subscription: res.portalUser.subscription
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const registerCompany = async (payload: RegisterCompanyPayload) => {
    setLoading(true);
    try {
      localStorage.setItem('dealflow_active_mode', 'staff');
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
      localStorage.removeItem('dealflow_active_mode');
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
