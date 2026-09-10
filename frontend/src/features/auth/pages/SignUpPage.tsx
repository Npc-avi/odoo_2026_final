import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hook/useAuth';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  AlertTriangle
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
    <div className="min-h-screen bg-[var(--app-bg-subtle,#f9fafb)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-3 group">
          <div className="w-8 h-8 rounded-lg bg-[var(--app-brand-red,#ff3b30)] flex items-center justify-center text-white font-black text-sm shadow-sm">
            D
          </div>
          <span className="font-display font-black text-lg tracking-tight text-[var(--app-text-primary,#111111)]">
            DEALFLOW<span className="text-[var(--app-brand-red,#ff3b30)]">360</span>
          </span>
        </Link>
        <h2 className="font-display font-black text-2xl tracking-tight text-[var(--app-text-primary,#111111)]">
          Create Workspace
        </h2>
      </div>

      {/* Main Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="app-card bg-white border border-[var(--app-border,#e5e7eb)] rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
          {/* Error Alert */}
          {error && (
            <div className="app-alert-error p-3 rounded-xl flex items-start gap-2.5 text-xs font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Name */}
            <div>
              <label className="app-label">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Industrial Dynamics"
                value={companyName}
                onChange={handleCompanyNameChange}
                className="app-input"
              />
            </div>

            {/* Subdomain & Currency in 2-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="app-label">Workspace Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. apex-dynamics"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="app-input"
                />
                <span className="text-[10px] font-mono text-[var(--app-text-muted,#6b7280)] mt-1 block">
                  {subdomain ? `${subdomain}.dealflow360.io` : 'Auto-generated'}
                </span>
              </div>

              <div>
                <label className="app-label">Default Currency</label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="app-input appearance-none cursor-pointer bg-white"
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

            {/* Admin User Details */}
            <div className="pt-2 border-t border-[var(--app-border,#e5e7eb)] space-y-3">
              <div>
                <label className="app-label">Admin Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Mercer"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="app-input"
                />
              </div>

              <div>
                <label className="app-label">Admin Email *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@yourcompany.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="app-input"
                />
              </div>

              <div>
                <label className="app-label">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full py-2.5 text-xs font-bold mt-2"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating workspace...</span>
                </div>
              ) : (
                <span>Create Workspace</span>
              )}
            </button>
          </form>

          {/* Footer Link to Login */}
          <div className="pt-2 text-center text-xs font-mono text-[var(--app-text-muted,#6b7280)] border-t border-[var(--app-border,#e5e7eb)]">
            <span>Already registered? </span>
            <Link
              to="/login"
              className="text-[var(--app-brand-red,#ff3b30)] font-bold hover:underline ml-1"
            >
              Sign In &rarr;
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
