import React from 'react';

interface StatusBadgeProps {
  status: string;
  repApproved?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, repApproved }) => {
  const normalized = (status || '').toLowerCase();

  const isRepApprovedInNegotiation =
    repApproved &&
    (normalized === 'under_negotiation' ||
      normalized === 'sent' ||
      normalized === 'negotiating' ||
      normalized === 'pending_manager');

  const getLabel = () => {
    if (isRepApprovedInNegotiation) {
      return 'REP APPROVED';
    }

    switch (normalized) {
      case 'in_fulfillment':
      case 'fulfillment':
      case 'fulfilling':
        return 'IN FULFILLMENT';
      case 'backorder':
      case 'backordered':
        return 'BACKORDER';
      case 'split_pending':
      case 'split pending':
        return 'SPLIT PENDING';
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
    if (isRepApprovedInNegotiation) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs';
    }

    switch (normalized) {
      case 'in_fulfillment':
      case 'fulfillment':
      case 'fulfilling':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'backorder':
      case 'backordered':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'split_pending':
      case 'split pending':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'confirmed':
      case 'approved':
      case 'accepted':
      case 'active':
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'sent':
      case 'under_negotiation':
      case 'negotiating':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'pending':
      case 'pending_manager':
      case 'pending_finance':
      case 'pending_approval':
      case 'under_review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rejected':
      case 'cancelled':
      case 'declined':
      case 'expired':
        return 'bg-rose-50 text-[#ff3b30] border-rose-200';
      case 'draft':
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-300';
    }
  };

  const getDotColor = () => {
    if (isRepApprovedInNegotiation) {
      return 'bg-indigo-400 animate-pulse';
    }

    switch (normalized) {
      case 'in_fulfillment':
      case 'fulfillment':
      case 'fulfilling':
        return 'bg-purple-400 animate-pulse';
      case 'backorder':
      case 'backordered':
        return 'bg-rose-400 animate-pulse';
      case 'split_pending':
      case 'split pending':
        return 'bg-blue-400 animate-pulse';
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
