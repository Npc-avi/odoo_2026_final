import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md bg-[#111]/95 backdrop-blur-md text-white border border-[#ff3b30]/60 shadow-2xl rounded-2xl p-4 flex items-start gap-3.5 animate-in slide-in-from-bottom-5 duration-300">
      <CheckCircle2 className="w-5 h-5 text-[#ff3b30] shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-bold text-xs uppercase tracking-wider text-[#ff3b30]">System Confirmation</p>
        <p className="text-xs text-neutral-200 mt-0.5 leading-relaxed">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-neutral-800 transition-colors"
        aria-label="Dismiss toast"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
