import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hook/useAuth';
import {
  Building2,
  Lock,
  Mail,
  User,
  Globe,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers
} from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerCompany } = useAuth();

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status State
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-slugify subdomain as company name is typed
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanyName(val);
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setSubdomain(slug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await registerCompany({
        companyName,
        subdomain: subdomain || undefined,
        defaultCurrency,
        fullName,
        email,
        password,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize company workspace. Please verify your inputs.');
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
      {/* LEFT HALF: High-Tech Telemetry Photo & Infrastructure Highlights          */}
      {/* ========================================================================= */}
      <div className="relative lg:w-1/2 w-full min-h-[380px] lg:min-h-screen bg-[#09090b]/80 backdrop-blur-sm flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden border-b lg:border-b-0 lg:border-r border-neutral-800 z-10">
        {/* Background Image with Cinematic Grading & Vignette (Exact from Login Page) */}
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

          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#ff3b30] bg-[#ff3b30]/10 border border-[#ff3b30]/20 px-3 py-1 rounded-full uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30] animate-pulse" />
            <span>NODE // ONBOARDING</span>
          </div>
        </div>

        {/* Center Brand Headline & Architecture Checklist */}
        <div className="relative z-10 my-auto py-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase">
            AUTONOMOUS QUOTE-TO-CASH TENANT PROVISIONING
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[1.05]">
            CREATE YOUR <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-red-200 to-[#ff3b30]">
              ENTERPRISE WORKSPACE
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-neutral-400 font-mono max-w-md leading-relaxed">
            Provision a zero-leakage PostgreSQL RLS partition with dedicated client directories, multi-warehouse stock splitting, and tiered discount governance.
          </p>

          {/* Infrastructure Guarantee Badges */}
          <div className="space-y-3 pt-2 max-w-md">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800 text-xs font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-white font-bold">Isolated RLS Tenant Architecture</div>
                <div className="text-neutral-500 text-[11px] mt-0.5">Strict database partition ensures no customer, quotation, or margin data ever overlaps between companies.</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800 text-xs font-mono">
              <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-white font-bold">Pre-Configured Logistics & Catalogs</div>
                <div className="text-neutral-500 text-[11px] mt-0.5">Dual-warehouse fulfillment, seed inventory, and product categories automatically instantiated.</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800 text-xs font-mono">
              <Cpu className="w-4 h-4 text-[#ff3b30] shrink-0 mt-0.5" />
              <div>
                <div className="text-white font-bold">Autonomous Discount Governance</div>
                <div className="text-neutral-500 text-[11px] mt-0.5">Instant multi-tier approval chains and live deal margin telemetry ready on day one.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Metadata on Left Panel */}
        <div className="relative z-10 pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between text-[10px] font-mono text-neutral-500 uppercase tracking-wider gap-2">
          <span>SECURE POSTGRES RLS PROVISIONER</span>
          <span className="text-neutral-400">DEALFLOW360 &bull; ENTERPRISE 2026</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT HALF: Interactive Company Registration Form Card                     */}
      {/* ========================================================================= */}
      <div className="lg:w-1/2 w-full flex items-center justify-center p-6 sm:p-10 lg:p-14 relative z-10 overflow-y-auto">
        {/* Subtle background glow */}
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[#ff3b30]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-lg space-y-6 relative z-10 rounded-3xl border border-neutral-800 bg-[#09090b]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-sm my-auto">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#ff3b30] to-rose-700 flex items-center justify-center shadow-[0_0_15px_rgba(255,59,48,0.3)]">
                <Building2 className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-black text-sm uppercase tracking-wider text-white">
                DEALFLOW<span className="text-[#ff3b30]">360</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                // ONBOARDING
              </span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-tight">
              REGISTER COMPANY
            </h2>
            <p className="text-xs text-neutral-400 font-mono mt-1">
              Create an enterprise organization with isolated member and client infrastructure.
            </p>
          </div>

          {/* Error Feedback */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-start gap-2.5 animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Company Profile */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase flex items-center gap-2 border-b border-neutral-800 pb-1.5">
                <span className="text-[#ff3b30]">01 //</span> COMPANY IDENTITY
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-300 uppercase tracking-wider mb-1">
                  Company Name <span className="text-[#ff3b30]">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Industrial Dynamics"
                    value={companyName}
                    onChange={handleCompanyNameChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30]/30 transition-all placeholder:text-neutral-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-300 uppercase tracking-wider mb-1">
                    Workspace Identifier
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. apex-dynamics"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#ff3b30] transition-all placeholder:text-neutral-600"
                    />
                  </div>
                  <span className="text-[9px] font-mono text-neutral-500 mt-1 block">
                    {subdomain ? `${subdomain}.dealflow360.io` : 'Auto-generated slug'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-300 uppercase tracking-wider mb-1">
                    Default Currency
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#ff3b30] transition-all appearance-none cursor-pointer"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Administrator Member */}
            <div className="space-y-3 pt-2">
              <div className="text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase flex items-center gap-2 border-b border-neutral-800 pb-1.5">
                <span className="text-[#ff3b30]">02 //</span> PRIMARY ADMINISTRATOR
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-300 uppercase tracking-wider mb-1">
                  Full Name <span className="text-[#ff3b30]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Mercer"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#ff3b30] transition-all placeholder:text-neutral-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-300 uppercase tracking-wider mb-1">
                  Admin Work Email <span className="text-[#ff3b30]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="admin@yourcompany.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#ff3b30] transition-all placeholder:text-neutral-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-300 uppercase tracking-wider mb-1">
                  Password <span className="text-[#ff3b30]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#ff3b30] transition-all placeholder:text-neutral-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#ff3b30] to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-[#ff3b30]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>PROVISIONING ISOLATED INFRASTRUCTURE...</span>
                  </>
                ) : (
                  <>
                    <span>INITIALIZE COMPANY WORKSPACE</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Link: Already have an account */}
          <div className="pt-4 border-t border-neutral-800 text-center font-mono text-xs">
            <span className="text-neutral-400">Already registered your enterprise workspace? </span>
            <Link
              to="/login"
              className="text-[#ff3b30] hover:text-red-400 font-bold hover:underline inline-flex items-center gap-1 ml-1"
            >
              Sign In to Workspace &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
