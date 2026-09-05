import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = (status || '').toLowerCase();

  const getLabel = () => {
    switch (normalized) {
      case 'confirmed':
      case 'approved':
      case 'accepted':
        return 'CONFIRMED';
      case 'sent':
      case 'under_negotiation':
      case 'negotiating':
        return 'NEGOTIATING';
      case 'pending':
      case 'pending_manager':
      case 'pending_finance':
      case 'pending_approval':
      case 'under_review':
        return 'PENDING APPROVAL';
      case 'rejected':
      case 'declined':
        return 'REJECTED';
      case 'draft':
        return 'DRAFT';
      default:
        return status.replace(/_/g, ' ').toUpperCase();
    }
  };

  const getStyle = () => {
    switch (normalized) {
      case 'confirmed':
      case 'approved':
      case 'accepted':
      case 'active':
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'sent':
      case 'under_negotiation':
      case 'negotiating':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'pending':
      case 'pending_manager':
      case 'pending_finance':
      case 'pending_approval':
      case 'under_review':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'rejected':
      case 'cancelled':
      case 'declined':
      case 'expired':
        return 'bg-[#ff3b30]/10 text-[#ff3b30] border-[#ff3b30]/30';
      case 'draft':
      default:
        return 'bg-neutral-900 text-neutral-400 border-neutral-800';
    }
  };

  const getDotColor = () => {
    switch (normalized) {
      case 'confirmed':
      case 'approved':
      case 'accepted':
      case 'active':
      case 'paid':
        return 'bg-emerald-400';
      case 'sent':
      case 'under_negotiation':
      case 'negotiating':
        return 'bg-cyan-400 animate-pulse';
      case 'pending':
      case 'pending_manager':
      case 'pending_finance':
      case 'pending_approval':
      case 'under_review':
        return 'bg-amber-400 animate-pulse';
      case 'rejected':
      case 'cancelled':
      case 'declined':
      case 'expired':
        return 'bg-[#ff3b30]';
      case 'draft':
      default:
        return 'bg-neutral-500';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border ${getStyle()}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />
      <span>{getLabel()}</span>
    </span>
  );
};
