import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hook/useAuth';
import { requestMagicLinkApi } from '../services/auth.api';
import {
  Shield,
  Building2,
  Users,
  Mail,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Briefcase,
  Crown
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginStaff, loginPortal, loading } = useAuth();

  // Role identity: 'member' (Company Staff) vs 'customer' (Client Company)
  const [loginType, setLoginType] = useState<'member' | 'customer'>(() => {
    return window.location.pathname.includes('/portal') ? 'customer' : 'member';
  });

  // Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Customer Magic Link option
  const [useMagicLink, setUseMagicLink] = useState(false);

  // Status feedback
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickLoadingRole, setQuickLoadingRole] = useState<string | null>(null);

  const QUICK_ACCOUNTS = [
    {
      key: 'admin',
      type: 'member' as const,
      roleLabel: 'Admin',
      name: 'Alice Admin',
      email: 'admin@acme.com',
      badgeText: 'Admin',
      icon: Crown,
    },
    {
      key: 'manager',
      type: 'member' as const,
      roleLabel: 'Manager',
      name: 'Mark Manager',
      email: 'manager@acme.com',
      badgeText: 'Manager',
      icon: Briefcase,
    },
    {
      key: 'rep',
      type: 'member' as const,
      roleLabel: 'Sales Rep',
      name: 'Rachel Rep',
      email: 'rep@acme.com',
      badgeText: 'Sales',
      icon: Users,
    },
    {
      key: 'customer',
      type: 'customer' as const,
      roleLabel: 'Customer',
      name: 'Bruce Wayne',
      email: 'bruce@wayne.com',
      badgeText: 'Gold',
      icon: Building2,
    },
  ];

  const handleQuickLogin = async (
    roleKey: string,
    type: 'member' | 'customer',
    quickEmail: string,
    quickPassword: string = 'Password123!'
  ) => {
    setError(null);
    setFeedback(null);
    setQuickLoadingRole(roleKey);
    setLoginType(type);
    setEmail(quickEmail);
    setPassword(quickPassword);
    setUseMagicLink(false);

    try {
      if (type === 'member') {
        await loginStaff({ email: quickEmail, password: quickPassword });
        navigate('/dashboard');
      } else {
        await loginPortal({ email: quickEmail, password: quickPassword });
        navigate('/portal');
      }
    } catch (err: any) {
      setError(err.message || `Quick login for ${quickEmail} failed.`);
    } finally {
      setQuickLoadingRole(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setIsSubmitting(true);

    try {
      if (loginType === 'member') {
        await loginStaff({ email, password });
        navigate('/dashboard');
      } else {
        if (useMagicLink) {
          const res = await requestMagicLinkApi(email);
          setFeedback(res.message || 'If an active portal account exists, a secure sign-in link has been dispatched.');
        } else {
          await loginPortal({ email, password });
          navigate('/portal');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg-subtle,#f9fafb)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-3 group">
          <div className="w-8 h-8 rounded-lg bg-[var(--app-brand-red,#ff3b30)] flex items-center justify-center text-white font-black text-sm shadow-sm">
            D
          </div>
          <span className="font-display font-black text-lg tracking-tight text-[var(--app-text-primary,#111111)]">
            DEALFLOW<span className="text-[var(--app-brand-red,#ff3b30)]">360</span>
          </span>
        </Link>
        <h2 className="font-display font-black text-2xl tracking-tight text-[var(--app-text-primary,#111111)]">
          Sign In
        </h2>
      </div>

      {/* Main Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="app-card bg-white border border-[var(--app-border,#e5e7eb)] rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--app-bg-muted,#f3f4f6)] rounded-xl border border-[var(--app-border-subtle,#f3f4f6)] text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setLoginType('member');
                setError(null);
                setFeedback(null);
              }}
              className={`py-2 px-3 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                loginType === 'member'
                  ? 'bg-white text-[var(--app-text-primary,#111111)] shadow-xs'
                  : 'text-[var(--app-text-muted,#6b7280)] hover:text-[var(--app-text-primary,#111111)]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Company Member</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginType('customer');
                setError(null);
                setFeedback(null);
              }}
              className={`py-2 px-3 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                loginType === 'customer'
                  ? 'bg-white text-[var(--app-text-primary,#111111)] shadow-xs'
                  : 'text-[var(--app-text-muted,#6b7280)] hover:text-[var(--app-text-primary,#111111)]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Customer Portal</span>
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="app-alert-error p-3 rounded-xl flex items-start gap-2.5 text-xs font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Feedback Alert */}
          {feedback && (
            <div className="app-alert-success p-3 rounded-xl flex items-start gap-2.5 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="app-label">
                {loginType === 'member' ? 'Corporate Email' : 'Account Email'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={loginType === 'member' ? 'rep@acme.com' : 'bruce@wayne.com'}
                  className="app-input pr-10"
                />
                <Mail className="w-4 h-4 text-[var(--app-text-subtle,#9ca3af)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {(!useMagicLink || loginType === 'member') && (
              <div>
                <label className="app-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!useMagicLink || loginType === 'member'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="app-input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-subtle,#9ca3af)] hover:text-[var(--app-text-secondary,#374151)] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Customer Magic Link Switcher */}
            {loginType === 'customer' && (
              <div className="flex items-center justify-between text-xs font-mono pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setUseMagicLink(!useMagicLink);
                    setError(null);
                  }}
                  className="text-[var(--app-brand-red,#ff3b30)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{useMagicLink ? 'Sign in with Password instead' : 'Use Passwordless Magic Link'}</span>
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="btn btn-primary w-full py-2.5 text-xs font-bold"
            >
              {isSubmitting || loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <span>
                  {useMagicLink && loginType === 'customer'
                    ? 'Send Magic Link'
                    : 'Sign In'}
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="pt-4 border-t border-[var(--app-border,#e5e7eb)] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--app-text-muted,#6b7280)]">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                <span>Quick Demo Logins</span>
              </div>
              <span className="text-[9px] font-mono text-[var(--app-text-subtle,#9ca3af)]">
                1-Click Sign In
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const isLoggingInThis = quickLoadingRole === acc.key;
                return (
                  <button
                    key={acc.key}
                    type="button"
                    disabled={isSubmitting || loading}
                    onClick={() => handleQuickLogin(acc.key, acc.type, acc.email)}
                    className="group relative p-2.5 rounded-xl border border-[var(--app-border,#e5e7eb)] hover:border-[var(--app-brand-red,#ff3b30)] hover:bg-[var(--app-brand-red-subtle,#fef2f2)] bg-white text-left transition-all cursor-pointer disabled:opacity-50 text-xs font-mono"
                  >
                    {isLoggingInThis && (
                      <div className="absolute inset-0 bg-white/90 flex items-center justify-center gap-1 z-10 rounded-xl">
                        <div className="w-3 h-3 border-2 border-neutral-300 border-t-[var(--app-brand-red,#ff3b30)] rounded-full animate-spin" />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1 font-bold text-[var(--app-text-primary,#111111)]">
                        <Icon className="w-3 h-3 text-[var(--app-brand-red,#ff3b30)]" />
                        <span>{acc.roleLabel}</span>
                      </div>
                      <span className="text-[8px] px-1 py-0.5 rounded font-semibold uppercase bg-neutral-100 text-neutral-600 border border-neutral-200">
                        {acc.badgeText}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--app-text-muted,#6b7280)] truncate">
                      {acc.email}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Additional Accounts */}
            <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-[var(--app-text-muted,#6b7280)]">
              <span>More:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting || loading}
                  onClick={() => handleQuickLogin('tony', 'customer', 'tony@stark.com')}
                  className="hover:text-[var(--app-brand-red,#ff3b30)] hover:underline cursor-pointer"
                >
                  Tony Stark (Platinum)
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  disabled={isSubmitting || loading}
                  onClick={() => handleQuickLogin('finance', 'member', 'finance@acme.com')}
                  className="hover:text-[var(--app-brand-red,#ff3b30)] hover:underline cursor-pointer"
                >
                  Frank Finance
                </button>
              </div>
            </div>
          </div>

          {/* Footer Link to Sign Up */}
          <div className="pt-2 text-center text-xs font-mono text-[var(--app-text-muted,#6b7280)]">
            <span>Don't have an account? </span>
            <Link
              to="/signup"
              className="text-[var(--app-brand-red,#ff3b30)] font-bold hover:underline ml-1"
            >
              Create Workspace &rarr;
            </Link>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-4 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-mono text-[var(--app-text-muted,#6b7280)] hover:text-[var(--app-text-primary,#111111)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
