import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  fetchGovernanceStaffApi,
  updateStaffRoleApi,
  toggleStaffStatusApi,
  createStaffMemberApi,
  fetchGovernanceCustomersApi,
  createCustomerMemberApi,
} from '../services/governance.api';
import { fetchSubscriptionPlansApi } from '../services/subscription.api';
import {
  Users,
  Building2,
  UserPlus,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  X,
  Mail,
  Award,
  ChevronDown,
  Sparkles,
  CreditCard
} from 'lucide-react';
import { toast } from 'react-toastify';

export const GovernanceStaffTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'customers'>('staff');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dropdown menu for Add Member
  const [isAddMenuOpen, setIsAddMenuOpen] = useState<boolean>(false);

  // Modals
  const [isAddStaffOpen, setIsAddStaffOpen] = useState<boolean>(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState<boolean>(false);

  // Staff Form
  const [staffName, setStaffName] = useState<string>('');
  const [staffEmail, setStaffEmail] = useState<string>('');
  const [staffRole, setStaffRole] = useState<string>('sales_rep');
  const [savingStaff, setSavingStaff] = useState<boolean>(false);

  // Customer Form
  const [custCompany, setCustCompany] = useState<string>('');
  const [custContact, setCustContact] = useState<string>('');
  const [custEmail, setCustEmail] = useState<string>('');
  const [custTier, setCustTier] = useState<string>('Silver');
  const [custPlanId, setCustPlanId] = useState<string>('');
  const [custCreditLimit, setCustCreditLimit] = useState<string>('50000');
  const [savingCustomer, setSavingCustomer] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [staffData, custData, plansData] = await Promise.all([
        fetchGovernanceStaffApi(),
        fetchGovernanceCustomersApi(),
        fetchSubscriptionPlansApi().catch(() => ({ plans: [] })),
      ]);
      setStaffList(staffData.staff || []);
      setCustomersList(custData.customers || []);
      setPlans(plansData.plans || []);
    } catch (err: any) {
      toast.error('Failed to load staff & customer directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle staff role change
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateStaffRoleApi(userId, newRole);
      setStaffList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      toast.success(`Role successfully changed to ${newRole}!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update staff role.');
    }
  };

  // Handle staff active toggle
  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleStaffStatusApi(userId, !currentStatus);
      setStaffList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      );
      toast.success(`Staff account ${!currentStatus ? 'activated' : 'deactivated'}.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update staff account status.');
    }
  };

  // Create Staff submit
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffEmail.trim() || !staffRole) {
      toast.warning('Please specify staff name, email, and role.');
      return;
    }

    try {
      setSavingStaff(true);
      const res = await createStaffMemberApi({
        full_name: staffName.trim(),
        email: staffEmail.trim(),
        role: staffRole,
      });

      toast.success(res.message || 'Staff member created successfully!');
      setIsAddStaffOpen(false);
      setStaffName('');
      setStaffEmail('');
      setStaffRole('sales_rep');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to register staff member.');
    } finally {
      setSavingStaff(false);
    }
  };

  // Create Customer submit
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custCompany.trim() || !custContact.trim() || !custEmail.trim()) {
      toast.warning('Company name, contact name, and email are required.');
      return;
    }

    try {
      setSavingCustomer(true);
      const res = await createCustomerMemberApi({
        company_name: custCompany.trim(),
        contact_name: custContact.trim(),
        email: custEmail.trim(),
        tier: custTier,
        credit_limit: Number(custCreditLimit) || 50000,
        subscription_plan_id: custPlanId || undefined,
      });

      toast.success(res.message || 'Customer registered with portal login access!');
      setIsAddCustomerOpen(false);
      setCustCompany('');
      setCustContact('');
      setCustEmail('');
      setCustTier('Silver');
      setCustPlanId('');
      setCustCreditLimit('50000');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create customer record.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.role || '').toLowerCase().includes(q)
    );
  });

  const filteredCustomers = customersList.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.contact_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.tier || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-fadeIn text-[#111111]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[10px] font-mono font-bold tracking-widest text-cyan-800 uppercase mb-2 shadow-xs">
            <Users className="w-3.5 h-3.5 text-cyan-600" />
            <span>ORGANIZATION &amp; ACCESS CONTROL</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tight text-[#111111]">
            Staff &amp; Members Governance
          </h2>
          <p className="app-page-subtitle">
            Manage company staff roles, review all client accounts, and onboard new staff or customers.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-3 relative">
          <button
            onClick={loadData}
            className="btn-icon"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Add Member Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsAddMenuOpen((prev) => !prev)}
              className="btn btn-primary rounded-full shadow-sm text-xs font-mono font-bold"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {isAddMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-neutral-200 p-2 shadow-xl z-50 animate-fadeIn"
                onClick={() => setIsAddMenuOpen(false)}
              >
                <button
                  onClick={() => setIsAddStaffOpen(true)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-neutral-50 text-xs font-mono font-bold text-neutral-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-cyan-600" />
                  <div>
                    <div className="text-neutral-900">Add New Staff</div>
                    <span className="text-[10px] text-neutral-500 font-normal">Internal role assignment</span>
                  </div>
                </button>

                <button
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-neutral-50 text-xs font-mono font-bold text-neutral-900 flex items-center gap-2.5 transition-colors cursor-pointer mt-1"
                >
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-neutral-900">Add New Customer</div>
                    <span className="text-[10px] text-neutral-500 font-normal">Company &amp; portal access</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 rounded-full bg-neutral-100 border border-neutral-200 font-mono text-xs self-start">
          <button
            onClick={() => setActiveSubTab('staff')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer font-bold flex items-center gap-2 ${
              activeSubTab === 'staff'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>STAFF DIRECTORY ({staffList.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('customers')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer font-bold flex items-center gap-2 ${
              activeSubTab === 'customers'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>CUSTOMERS &amp; PORTAL ({customersList.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeSubTab === 'staff' ? 'Search staff by name/email...' : 'Search customers...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full bg-white border border-neutral-300 text-xs font-mono text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] shadow-2xs"
          />
        </div>
      </div>

      {/* VIEW 1: STAFF DIRECTORY */}
      {activeSubTab === 'staff' && (
        <div className="app-table-wrapper rounded-3xl overflow-hidden shadow-xs border border-neutral-200 bg-white">
          <div className="app-table-scroll">
            <table className="app-table">
              <thead className="app-thead bg-neutral-50 text-neutral-600 border-b border-neutral-200">
                <tr>
                  <th className="app-th">Staff Member</th>
                  <th className="app-th">Assigned Role (Editable)</th>
                  <th className="app-th">Discount Discretion</th>
                  <th className="app-th text-center">Status</th>
                  <th className="app-th">Onboarded</th>
                </tr>
              </thead>
              <tbody className="app-tbody divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="app-td py-12 text-center text-neutral-500">
                      <div className="w-7 h-7 border-2 border-neutral-200 border-t-[#ff3b30] rounded-full animate-spin mx-auto mb-3" />
                      <span>Loading staff directory...</span>
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="app-td py-12 text-center text-neutral-500">
                      No staff members match the query.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => (
                    <tr key={staff.id} className="app-tr hover:bg-neutral-50/70 transition-colors">
                      <td className="app-td">
                        <div className="font-bold text-neutral-900 text-sm">{staff.full_name}</div>
                        <div className="text-neutral-500 text-[11px] font-mono mt-0.5">{staff.email}</div>
                      </td>
                      <td className="app-td">
                        <select
                          value={staff.role}
                          onChange={(e) => handleRoleChange(staff.id, e.target.value)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-neutral-300 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] cursor-pointer shadow-2xs"
                        >
                          <option value="admin">Administrator (admin)</option>
                          <option value="sales_manager">Sales Manager (sales_manager)</option>
                          <option value="finance">Finance Officer (finance)</option>
                          <option value="sales_rep">Sales Representative (sales_rep)</option>
                        </select>
                      </td>
                      <td className="app-td font-mono">
                        <span className="font-bold text-neutral-900">{staff.historical_discount_avg || '5.0'}%</span>
                        <span className="text-[10px] text-neutral-500 block">Baseline cap</span>
                      </td>
                      <td className="app-td text-center">
                        <button
                          onClick={() => handleToggleStatus(staff.id, staff.is_active)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                            staff.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
                          }`}
                        >
                          {staff.is_active ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-neutral-500" />}
                          <span>{staff.is_active ? 'Active' : 'Suspended'}</span>
                        </button>
                      </td>
                      <td className="app-td text-neutral-500 text-[11px] font-mono">
                        {staff.created_at ? new Date(staff.created_at).toLocaleDateString() : 'Initial'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: CUSTOMERS DIRECTORY */}
      {activeSubTab === 'customers' && (
        <div className="app-table-wrapper rounded-3xl overflow-hidden shadow-xs border border-neutral-200 bg-white">
          <div className="app-table-scroll">
            <table className="app-table">
              <thead className="app-thead bg-neutral-50 text-neutral-600 border-b border-neutral-200">
                <tr>
                  <th className="app-th">Company Account</th>
                  <th className="app-th">Primary Contact &amp; Email</th>
                  <th className="app-th">Customer Tier</th>
                  <th className="app-th">Active Plan</th>
                  <th className="app-th">Credit Limit</th>
                  <th className="app-th text-center">Portal Access</th>
                </tr>
              </thead>
              <tbody className="app-tbody divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="app-td py-12 text-center text-neutral-500">
                      <div className="w-7 h-7 border-2 border-neutral-200 border-t-[#ff3b30] rounded-full animate-spin mx-auto mb-3" />
                      <span>Loading customers directory...</span>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="app-td py-12 text-center text-neutral-500">
                      No customer accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="app-tr hover:bg-neutral-50/70 transition-colors">
                      <td className="app-td font-bold text-neutral-900 text-sm">
                        {cust.company_name}
                      </td>
                      <td className="app-td">
                        <div className="font-bold text-neutral-900">{cust.contact_name}</div>
                        <div className="text-neutral-500 text-[11px] font-mono">{cust.email}</div>
                      </td>
                      <td className="app-td">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                            cust.tier === 'Platinum'
                              ? 'bg-purple-50 border-purple-200 text-purple-700'
                              : cust.tier === 'Gold'
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : cust.tier === 'Silver'
                              ? 'bg-slate-100 border-slate-200 text-slate-700'
                              : 'bg-orange-50 border-orange-200 text-orange-700'
                          }`}
                        >
                          {cust.tier}
                        </span>
                      </td>
                      <td className="app-td font-mono">
                        {cust.subscription_plan_name ? (
                          <span className="font-bold text-cyan-700">
                            {cust.subscription_plan_name}
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-[11px]">Standard Tier</span>
                        )}
                      </td>
                      <td className="app-td font-mono text-neutral-900 font-bold">
                        ${Number(cust.credit_limit || 0).toLocaleString()}
                      </td>
                      <td className="app-td text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                            cust.has_portal_access
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{cust.has_portal_access ? 'Active' : 'Unregistered'}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD STAFF MEMBER */}
      {isAddStaffOpen &&
        createPortal(
          <div className="app-modal-overlay" onClick={() => setIsAddStaffOpen(false)}>
            <div className="app-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="app-modal-header">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="app-modal-title">Register Staff Member</h3>
                    <span className="text-[10px] font-mono text-neutral-500">Eligible to login immediately</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="app-modal-close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="flex flex-col flex-1 min-h-0">
                <div className="app-modal-body space-y-4 font-mono text-xs">
                  <div className="space-y-1.5">
                    <label className="app-label">
                      Full Name <span className="text-[#ff3b30]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rachel Wayne"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      className="app-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="app-label">
                      Staff Email (Gmail or Company Email) <span className="text-[#ff3b30]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rachel@wayne.com"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      className="app-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="app-label">
                      Staff Role <span className="text-[#ff3b30]">*</span>
                    </label>
                    <select
                      value={staffRole}
                      onChange={(e) => setStaffRole(e.target.value)}
                      className="app-input cursor-pointer"
                    >
                      <option value="sales_rep">Sales Representative (sales_rep)</option>
                      <option value="sales_manager">Sales Manager (sales_manager)</option>
                      <option value="finance">Finance Officer (finance)</option>
                      <option value="admin">Administrator (admin)</option>
                    </select>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600">
                    <span className="font-bold text-cyan-800 block mb-1">Standard Authentication:</span>
                    Password is automatically set to <code className="text-neutral-900 font-bold bg-neutral-200 px-1.5 py-0.5 rounded">Password123!</code> so the member can sign in immediately at <span className="text-cyan-700 font-bold">/login</span>.
                  </div>
                </div>

                <div className="app-modal-footer">
                  <button
                    type="button"
                    onClick={() => setIsAddStaffOpen(false)}
                    className="btn btn-secondary rounded-full cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingStaff}
                    className="btn btn-primary rounded-full cursor-pointer"
                  >
                    {savingStaff ? 'Registering...' : 'Confirm Staff Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 2: ADD CUSTOMER ACCOUNT */}
      {isAddCustomerOpen &&
        createPortal(
          <div className="app-modal-overlay" onClick={() => setIsAddCustomerOpen(false)}>
            <div className="app-modal-dialog max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="app-modal-header">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="app-modal-title">Register New Customer</h3>
                    <span className="text-[10px] font-mono text-neutral-500">Creates customer &amp; active portal user</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="app-modal-close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="flex flex-col flex-1 min-h-0">
                <div className="app-modal-body space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="app-label">
                        Company Name <span className="text-[#ff3b30]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Wayne Enterprises"
                        value={custCompany}
                        onChange={(e) => setCustCompany(e.target.value)}
                        className="app-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="app-label">
                        Contact Person Name <span className="text-[#ff3b30]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bruce Wayne"
                        value={custContact}
                        onChange={(e) => setCustContact(e.target.value)}
                        className="app-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="app-label">
                      Customer Email (Gmail / Corporate) <span className="text-[#ff3b30]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. bruce@wayne.com"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      className="app-input"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="app-label">
                        Customer Tier
                      </label>
                      <select
                        value={custTier}
                        onChange={(e) => setCustTier(e.target.value)}
                        className="app-input cursor-pointer"
                      >
                        <option value="Bronze">Bronze Tier</option>
                        <option value="Silver">Silver Tier</option>
                        <option value="Gold">Gold Tier</option>
                        <option value="Platinum">Platinum Tier</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="app-label">
                        Credit Limit ($)
                      </label>
                      <input
                        type="number"
                        value={custCreditLimit}
                        onChange={(e) => setCustCreditLimit(e.target.value)}
                        className="app-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="app-label">
                      Subscription Plan (Optional)
                    </label>
                    <select
                      value={custPlanId}
                      onChange={(e) => setCustPlanId(e.target.value)}
                      className="app-input cursor-pointer"
                    >
                      <option value="">None / Standard Pay-as-you-go</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.cadence || 'monthly'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600">
                    <span className="font-bold text-emerald-800 block mb-1">Customer Portal Access:</span>
                    The client can log in directly at <span className="text-emerald-700 font-bold">/portal/login</span> or <span className="text-emerald-700 font-bold">/login</span> using their email and shared password <code className="text-neutral-900 font-bold bg-neutral-200 px-1.5 py-0.5 rounded">Password123!</code>.
                  </div>
                </div>

                <div className="app-modal-footer">
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerOpen(false)}
                    className="btn btn-secondary rounded-full cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCustomer}
                    className="btn btn-primary rounded-full cursor-pointer"
                  >
                    {savingCustomer ? 'Registering...' : 'Register Customer & Portal'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default GovernanceStaffTab;
