'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, Check, X, ArrowRight, MessageSquare, Home, RefreshCw, AlertCircle } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dateFormatter';

interface RequestCardProps {
  id: string;
  type: 'Leave' | 'WFH' | 'Swap';
  employeeName: string;
  employeeRole: string;
  employeeEmail?: string;
  startDate: string;
  endDate?: string;
  reason?: string;
  status: string;
  details?: string;
  appliedOn?: string;
  onApprove?: () => Promise<void> | void;
  onReject?: () => Promise<void> | void;
  actionLoading?: boolean;
  showActions?: boolean;
}

export function RequestCard({
  id,
  type,
  employeeName,
  employeeRole,
  employeeEmail,
  startDate,
  endDate,
  reason,
  status,
  details,
  appliedOn,
  onApprove,
  onReject,
  actionLoading = false,
  showActions = true,
}: RequestCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Badge styles by request type
  const typeBadgeStyles = {
    WFH: {
      bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.15)]',
      icon: <Home size={12} className="text-purple-400" />,
      label: 'WFH',
    },
    Leave: {
      bg: 'bg-odizo-red/10 border border-odizo-red/20 text-odizo-red shadow-[0_0_12px_rgba(225,97,103,0.15)]',
      icon: <Calendar size={12} className="text-odizo-red" />,
      label: 'LEAVE',
    },
    Swap: {
      bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]',
      icon: <RefreshCw size={12} className="text-blue-400" />,
      label: 'SHIFT SWAP',
    },
  };

  const currentTypeStyle = typeBadgeStyles[type];

  // Status styles
  const isPending = status === 'Pending' || status === 'Pending Admin' || status === 'Pending Target';
  const isApproved = status === 'Approved';
  const isRejected = status === 'Rejected';

  let statusBadgeClass = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.1)]';
  if (isApproved) {
    statusBadgeClass = 'bg-green-500/10 border-green-500/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]';
  } else if (isRejected) {
    statusBadgeClass = 'bg-odizo-red/10 border border-odizo-red/20 text-odizo-red shadow-[0_0_10px_rgba(225,97,103,0.15)]';
  }

  return (
    <motion.div
      whileHover={{
        y: -5,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 15px rgba(225, 97, 103, 0.1)',
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-5 bg-slate-900/40 dark:bg-black/40 border border-white/10 flex flex-col justify-between h-full relative overflow-hidden text-left"
    >
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] rounded-full blur-2xl pointer-events-none" />
      {type === 'Leave' && (
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-odizo-red/[0.03] rounded-full blur-2xl pointer-events-none" />
      )}
      {type === 'WFH' && (
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-purple-500/[0.03] rounded-full blur-2xl pointer-events-none" />
      )}
      {type === 'Swap' && (
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-blue-500/[0.03] rounded-full blur-2xl pointer-events-none" />
      )}

      <div>
        {/* Card Header: Employee and Type Info */}
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Beautiful Gradient Avatar */}
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 dark:from-zinc-900 dark:to-zinc-800 border border-white/15 flex items-center justify-center text-xs font-bold text-white shadow-inner">
              {getInitials(employeeName)}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate max-w-[130px] leading-tight">
                {employeeName}
              </h4>
              <p className="text-[10px] text-odizo-grey mt-0.5 uppercase tracking-wider font-semibold">
                {employeeRole}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border tracking-wider ${currentTypeStyle.bg}`}
          >
            {currentTypeStyle.icon}
            {currentTypeStyle.label}
          </span>
        </div>

        {/* Date Display */}
        <div className="bg-white/[0.02] dark:bg-black/25 border border-white/5 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Calendar size={14} className="text-odizo-red" />
            <span>{formatDisplayDate(startDate)}</span>
            {endDate && (
              <>
                <ArrowRight size={12} className="text-odizo-grey" />
                <span>{formatDisplayDate(endDate)}</span>
              </>
            )}
          </div>
          {startDate && endDate && (
            <div className="text-[10px] text-odizo-grey mt-1">
              Duration:{' '}
              <strong className="text-white font-medium">
                {(() => {
                  const s = new Date(startDate.split('T')[0]);
                  const e = new Date(endDate.split('T')[0]);
                  const diffTime = Math.abs(e.getTime() - s.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
                })()}
              </strong>
            </div>
          )}
          {appliedOn && (
            <div className="text-[9px] text-odizo-grey/80 mt-1">
              Applied on: {formatDisplayDate(appliedOn)}
            </div>
          )}
        </div>

        {/* Details & Reason */}
        {details && (
          <div className="text-xs text-blue-300 bg-blue-500/5 border border-blue-500/10 rounded-xl p-2.5 mb-3 font-medium">
            {details}
          </div>
        )}

        {reason && (
          <div className="mb-4">
            <p className="text-[10px] text-odizo-grey uppercase tracking-wider font-bold mb-1">
              Reason
            </p>
            <p className="text-xs text-gray-300 bg-white/[0.01] border border-white/5 p-2.5 rounded-xl line-clamp-2 hover:line-clamp-none transition-all duration-300">
              {reason}
            </p>
          </div>
        )}
      </div>

      {/* Footer: Status & Action Buttons */}
      <div className="flex items-center justify-between gap-4 mt-auto pt-3 border-t border-white/5">
        <span
          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeClass}`}
        >
          {status}
        </span>

        {showActions && isPending && (onApprove || onReject) && (
          <div className="flex gap-2">
            {onReject && (
              <button
                onClick={onReject}
                disabled={actionLoading}
                title="Reject Request"
                className="flex items-center justify-center p-2 rounded-xl bg-odizo-red/10 border border-odizo-red/25 hover:border-odizo-red/50 hover:bg-odizo-red/20 text-odizo-red transition-all cursor-pointer disabled:opacity-50"
              >
                <X size={14} />
              </button>
            )}
            {onApprove && (
              <button
                onClick={onApprove}
                disabled={actionLoading}
                title="Approve Request"
                className="flex items-center justify-center p-2 rounded-xl bg-green-500/10 border border-green-500/25 hover:border-green-500/50 hover:bg-green-500/20 text-green-400 transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border border-green-400 border-t-transparent" />
                ) : (
                  <Check size={14} />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default RequestCard;
