import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyMagicLinkApi } from '../services/auth.api';
import { useAuth } from '../hook/useAuth';
import { ScrambleCTAButton } from '@/components/ScrambleCTAButton';

export const PortalVerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkSession } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMessage('Missing verification token.');
      return;
    }

    verifyMagicLinkApi(token)
      .then(async () => {
        setStatus('success');
        await checkSession();
        setTimeout(() => navigate('/portal', { replace: true }), 1000);
      })
      .catch((err: any) => {
        setStatus('error');
        setErrorMessage(err.message || 'Magic link verification failed or expired.');
      });
  }, [searchParams, navigate, checkSession]);

  return (
    <div className="min-h-screen bg-[#050f1d] flex items-center justify-center p-6 text-white text-center font-mono">
      <div className="max-w-md w-full bg-[#09090b] border border-neutral-800 p-10 rounded-3xl shadow-2xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-bold tracking-widest text-[#ff3b30] uppercase">
          SECURITY GATEWAY // SESSION
        </div>

        {status === 'verifying' && (
          <div className="space-y-4 py-4">
            <div className="w-10 h-10 border-2 border-white/20 border-t-[#ff3b30] rounded-full animate-spin mx-auto" />
            <h3 className="font-display font-black text-xl text-white uppercase tracking-tight">
              VERIFYING ACCESS TOKEN
            </h3>
            <p className="text-xs text-neutral-400">Authenticating cryptographic token with PostgreSQL RLS engine...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3 py-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-lg font-bold">
              ✓
            </div>
            <h3 className="font-display font-black text-2xl text-white uppercase tracking-tight">
              PORTAL SESSION ACTIVE
            </h3>
            <p className="text-xs text-neutral-400">Redirecting to your authorized customer portal...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-4">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-[#ff3b30] flex items-center justify-center mx-auto text-lg font-bold">
              ✕
            </div>
            <h3 className="font-display font-black text-xl text-white uppercase tracking-tight">
              VERIFICATION FAILED
            </h3>
            <p className="text-xs text-rose-400 max-w-xs mx-auto">{errorMessage}</p>
            <div className="pt-2">
              <ScrambleCTAButton
                text="RETURN TO LOGIN"
                variant="red"
                size="sm"
                onClick={() => navigate('/login')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
