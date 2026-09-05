import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
}

export const GenericModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl'
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} bg-white border border-neutral-200 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 relative text-neutral-900`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-200 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[9px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-1">
              SYSTEM MODAL // ACTION
            </div>
            <h3 className="font-display font-black text-xl sm:text-2xl text-neutral-900 uppercase tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-neutral-500 font-mono mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
};
