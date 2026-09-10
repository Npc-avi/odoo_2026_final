import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hook/useAuth';
import { requestMagicLinkApi } from '../services/auth.api';
import {
  Shield,
  Building2,
  Users,
  Key,
  Mail,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Activity,
  Cpu,
  Zap,
  Briefcase,
  Crown
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginStaff, loginPortal, loading } = useAuth();

  // Role identity: 'member' (Company Staff) vs 'customer' (Client Company)
  const [loginType, setLoginType] = useState<'member' | 'customer'>('member');
  
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
      badgeText: 'FULL ACCESS',
      badgeClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      borderClass: 'border-neutral-800 hover:border-rose-500/60 bg-neutral-900/60 hover:bg-rose-500/[0.06]',
      iconColor: 'text-rose-400',
      icon: Crown,
    },
    {
      key: 'manager',
      type: 'member' as const,
      roleLabel: 'Manager',
      name: 'Mark Manager',
      email: 'manager@acme.com',
      badgeText: 'APPROVALS',
      badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      borderClass: 'border-neutral-800 hover:border-amber-500/60 bg-neutral-900/60 hover:bg-amber-500/[0.06]',
      iconColor: 'text-amber-400',
      icon: Briefcase,
    },
    {
      key: 'rep',
      type: 'member' as const,
      roleLabel: 'Sales Rep',
      name: 'Rachel Rep',
      email: 'rep@acme.com',
      badgeText: 'QUOTES & RFQ',
      badgeClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      borderClass: 'border-neutral-800 hover:border-blue-500/60 bg-neutral-900/60 hover:bg-blue-500/[0.06]',
      iconColor: 'text-blue-400',
      icon: Users,
    },
    {
      key: 'customer',
      type: 'customer' as const,
      roleLabel: 'Customer',
      name: 'Bruce Wayne',
      email: 'bruce@wayne.com',
      badgeText: 'GOLD TIER',
      badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      borderClass: 'border-neutral-800 hover:border-emerald-500/60 bg-neutral-900/60 hover:bg-emerald-500/[0.06]',
      iconColor: 'text-emerald-400',
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
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col lg:flex-row overflow-hidden relative selection:bg-[#ff3b30] selection:text-white">
      {/* Background Technical Grid with dots & '+' intersections (Exact from Landing Page Workflow) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="w-full h-full opacity-45"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1.5px, transparent 0),
              linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px, 64px 64px, 64px 64px',
          }}
        />
        <div className="absolute inset-0 flex flex-wrap justify-between p-6 sm:p-10 opacity-60 text-[11px] font-mono text-neutral-400">
          {[...Array(28)].map((_, i) => (
            <span key={i} className="inline-block p-3 select-none">+</span>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEFT HALF: High-Tech Telemetry Photo & Brand Showcase                     */}
      {/* ========================================================================= */}
      <div className="relative lg:w-1/2 w-full min-h-[380px] lg:min-h-screen bg-[#09090b]/80 backdrop-blur-sm flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden border-b lg:border-b-0 lg:border-r border-neutral-800 z-10">
        {/* Background Image with Cinematic Grading & Vignette */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop"
            alt="Sales Operations Telemetry"
            className="w-full h-full object-cover object-center filter grayscale contrast-125 opacity-25 scale-105 transition-transform duration-1000 ease-out"
          />
          {/* Duotone Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />
        </div>

        {/* Top Header on Left Panel */}
        <div className="relative z-10 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono tracking-wider text-neutral-300 hover:text-white transition-all group backdrop-blur-md"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-[#ff3b30]" />
            <span>BACK TO OVERVIEW</span>
          </Link>

          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>NODE // LIVE</span>
          </div>
        </div>

        {/* Center Telemetry & Visual Graphic */}
        <div className="relative z-10 my-auto py-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase">
            AUTONOMOUS QUOTE-TO-CASH
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[1.05]">
            INTELLIGENT SALES <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400">
              OPERATIONS MATRIX
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-neutral-400 font-mono max-w-md leading-relaxed">
            Multi-tier discount governance, stock-aware warehouse fulfillment, hybrid subscription billing, and real-time portal negotiations.
          </p>

          {/* Floating Telemetry Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-w-lg">
            <div className="p-3.5 rounded-2xl bg-[#09090b]/90 border border-neutral-800 backdrop-blur-md space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 uppercase">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <Cpu className="w-3 h-3" />
                  <span>Blended Risk</span>
                </span>
                <span className="text-emerald-400 font-bold">0.00% LEAK</span>
              </div>
              <div className="text-xs font-semibold text-white font-mono">Real-Time Margin Guard</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#09090b]/90 border border-neutral-800 backdrop-blur-md space-y-1 shadow-lg">
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 uppercase">
                <span className="flex items-center gap-1.5 text-[#ff3b30]">
                  <Activity className="w-3 h-3" />
                  <span>Dual Depots</span>
                </span>
                <span className="text-cyan-400 font-bold">AUTO-SPLIT</span>
              </div>
              <div className="text-xs font-semibold text-white font-mono">Stock-Aware Dispatch</div>
            </div>
          </div>
        </div>

        {/* Bottom Metadata on Left Panel */}
        <div className="relative z-10 pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between text-[10px] font-mono text-neutral-500 uppercase tracking-wider gap-2">
          <span>SECURE POSTGRES RLS SESSION</span>
          <span className="text-neutral-400">DEALFLOW360 &bull; ENTERPRISE 2026</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT HALF: Interactive Dual-Role Login Interface                         */}
      {/* ========================================================================= */}
      <div className="lg:w-1/2 w-full flex items-center justify-center p-6 sm:p-10 lg:p-14 relative z-10">
        {/* Subtle background glow */}
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-[#ff3b30]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 relative z-10 rounded-3xl border border-neutral-800 bg-[#09090b]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#ff3b30] to-rose-700 flex items-center justify-center shadow-[0_0_15px_rgba(255,59,48,0.3)]">
                <Lock className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-black text-sm uppercase tracking-wider text-white">
                DEALFLOW<span className="text-[#ff3b30]">360</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                // GATEWAY
              </span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-tight">
              ACCESS PORTAL
            </h2>
            <p className="text-xs text-neutral-400 font-mono mt-1">
              Select your organization identity to authenticate into DealFlow360.
            </p>
          </div>

          {/* ===================================================================== */}
          {/* DUAL IDENTITY SELECTOR: Company Member vs Customer                   */}
          {/* ===================================================================== */}
          <div className="grid grid-cols-2 gap-2 bg-neutral-900/90 p-1.5 rounded-2xl border border-white/10 shadow-inner">
            {/* Option 1: Member of Company */}
            <button
              type="button"
              onClick={() => {
                setLoginType('member');
                setError(null);
                setFeedback(null);
              }}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl transition-all font-mono text-xs cursor-pointer ${
                loginType === 'member'
                  ? 'bg-gradient-to-r from-[#ff3b30] to-rose-600 text-white font-bold shadow-lg shadow-[#ff3b30]/25'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold leading-none">Company Member</div>
                <div className="text-[9px] opacity-75 leading-tight mt-0.5">Staff & Sales Ops</div>
              </div>
            </button>

            {/* Option 2: Customer */}
            <button
              type="button"
              onClick={() => {
                setLoginType('customer');
                setError(null);
                setFeedback(null);
              }}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl transition-all font-mono text-xs cursor-pointer ${
                loginType === 'customer'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-lg shadow-cyan-500/25'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold leading-none">Customer Portal</div>
                <div className="text-[9px] opacity-75 leading-tight mt-0.5">Client Accounts</div>
              </div>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success / Feedback Banner */}
          {feedback && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{feedback}</span>
            </div>
          )}

          {/* ===================================================================== */}
          {/* LOGIN FORM                                                           */}
          {/* ===================================================================== */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase">
                  {loginType === 'member' ? 'Corporate Email' : 'Authorized Account Email'}
                </label>
                <span className="text-[9px] font-mono text-neutral-500">REQUIRED</span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={loginType === 'member' ? 'rep@acme.com' : 'bruce@wayne.com'}
                  className="w-full bg-neutral-900/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] transition-colors font-mono"
                />
                <Mail className="w-4 h-4 text-neutral-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {/* Password Field (when not using Magic Link) */}
            {(!useMagicLink || loginType === 'member') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase">
                    Security Password
                  </label>
                  <span className="text-[9px] font-mono text-neutral-500">ENCRYPTED ARGON2</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!useMagicLink || loginType === 'member'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-neutral-900/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] transition-colors font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-neutral-500 hover:text-neutral-300 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Customer Magic Link Switcher */}
            {loginType === 'customer' && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setUseMagicLink(!useMagicLink);
                    setError(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 text-[11px] font-mono"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{useMagicLink ? 'Sign in with Password instead' : 'Use Passwordless Magic Link'}</span>
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className={`w-full py-3.5 px-6 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                loginType === 'member'
                  ? 'bg-gradient-to-r from-[#ff3b30] to-rose-600 hover:from-[#ff4d42] hover:to-rose-500 text-white shadow-[#ff3b30]/20'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
              }`}
            >
              {isSubmitting || loading ? (
                <div className="flex items-center gap-2 font-mono text-xs">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>AUTHENTICATING NODE...</span>
                </div>
              ) : (
                <>
                  <span>
                    {useMagicLink && loginType === 'customer'
                      ? 'SEND ONE-TIME MAGIC LINK'
                      : loginType === 'member'
                      ? 'SIGN IN AS COMPANY MEMBER'
                      : 'SIGN IN TO CUSTOMER PORTAL'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* ===================================================================== */}
          {/* QUICK LOGIN BUTTONS (ADMIN, MANAGER, SALES REP, CUSTOMER)            */}
          {/* ===================================================================== */}
          <div className="pt-4 border-t border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 animate-pulse" />
                <span className="font-semibold text-neutral-300">Quick Demo Logins</span>
              </div>
              <span className="text-[9px] font-mono text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full">
                1-Click Sign In
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const isLoggingInThis = quickLoadingRole === acc.key;
                const isDisabled = isSubmitting || loading;

                return (
                  <button
                    key={acc.key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleQuickLogin(acc.key, acc.type, acc.email)}
                    title={`Click to instantly sign in as ${acc.name} (${acc.roleLabel})`}
                    className={`group relative p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${acc.borderClass}`}
                  >
                    {/* Active Loading Overlay */}
                    {isLoggingInThis && (
                      <div className="absolute inset-0 bg-[#09090b]/90 backdrop-blur-xs flex items-center justify-center gap-1.5 z-10">
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span className="text-[10px] font-mono text-white">Signing in...</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${acc.iconColor}`} />
                        <span className="font-display font-black text-xs uppercase tracking-tight text-white">
                          {acc.roleLabel}
                        </span>
                      </div>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border font-semibold tracking-wider uppercase ${acc.badgeClass}`}>
                        {acc.badgeText}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-1">
                        <div className="text-[11px] font-medium text-neutral-200 truncate font-mono">
                          {acc.name}
                        </div>
                        <div className="text-[9px] text-neutral-500 font-mono truncate group-hover:text-neutral-400 transition-colors">
                          {acc.email}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Additional Seed Accounts quick switcher */}
            <div className="flex items-center justify-between pt-1 px-1 text-[10px] font-mono text-neutral-500">
              <span>More roles:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting || loading}
                  onClick={() => handleQuickLogin('tony', 'customer', 'tony@stark.com')}
                  className="hover:text-cyan-400 hover:underline transition-colors cursor-pointer"
                  title="Tony Stark (Stark Industries - Platinum Customer)"
                >
                  Tony Stark (Platinum)
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  disabled={isSubmitting || loading}
                  onClick={() => handleQuickLogin('finance', 'member', 'finance@acme.com')}
                  className="hover:text-rose-400 hover:underline transition-colors cursor-pointer"
                  title="Frank Finance (Finance Ops)"
                >
                  Frank Finance
                </button>
              </div>
            </div>
          </div>

          {/* New Company Onboarding Link */}
          <div className="pt-4 border-t border-neutral-800 text-center font-mono text-xs">
            <span className="text-neutral-400">Need to register a new organization? </span>
            <Link
              to="/signup"
              className="text-[#ff3b30] hover:text-red-400 font-bold hover:underline inline-flex items-center gap-1 ml-1"
            >
              Create Workspace &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
