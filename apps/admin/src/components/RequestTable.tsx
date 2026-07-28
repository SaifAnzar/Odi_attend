'use client';

import React from 'react';
import { 
  Eye, 
  Check, 
  X, 
  Calendar, 
  Home, 
  Clock, 
  ArrowRight,
  FileText,
  User as UserIcon
} from 'lucide-react';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { RequestItem } from './RequestDetailsModal';

interface RequestTableProps {
  requests: RequestItem[];
  defaultType: 'Leave' | 'WFH';
  isAdmin: boolean;
  onViewDetails: (item: RequestItem) => void;
  onApprove?: (id: string) => Promise<void> | void;
  onReject?: (id: string) => void;
  actionLoading?: boolean;
}

const getInitials = (name?: string) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getDaysDiff = (startIso: string, endIso: string) => {
  if (!startIso || !endIso) return 1;
  const sDatePart = startIso.split('T')[0];
  const eDatePart = endIso.split('T')[0];
  const [sy, sm, sd] = sDatePart.split('-').map(Number);
  const [ey, em, ed] = eDatePart.split('-').map(Number);
  
  const sUTC = Date.UTC(sy, sm - 1, sd);
  const eUTC = Date.UTC(ey, em - 1, ed);
  const diffTime = Math.abs(eUTC - sUTC);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export function RequestTable({
  requests,
  defaultType,
  isAdmin,
  onViewDetails,
  onApprove,
  onReject,
  actionLoading = false,
}: RequestTableProps) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center glass-card border-black/5 dark:border-white/5 p-8 rounded-2xl">
        <FileText className="text-odizo-grey/40 mb-3" size={44} />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          No {defaultType} Requests Found
        </h3>
        <p className="text-xs text-odizo-grey mt-1">
          There are no {defaultType.toLowerCase()} requests matching your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card floating-shadow border-black/5 dark:border-white/5 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/[0.02] text-odizo-grey font-bold text-[11px] uppercase tracking-wider">
              {isAdmin && <th className="py-3.5 px-4">Employee</th>}
              <th className="py-3.5 px-4">Dates & Duration</th>
              <th className="py-3.5 px-4">Reason</th>
              <th className="py-3.5 px-4">Applied On</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {requests.map((item) => {
              const duration = getDaysDiff(item.startDate, item.endDate);
              const isPending = item.status === 'Pending' || item.status === 'Pending Admin';
              const isApproved = item.status === 'Approved';
              const isRejected = item.status === 'Rejected';
              const empName = item.userId?.name || 'Unknown User';
              const empRole = item.userId?.role || 'Employee';
              const empEmail = item.userId?.email || '';

              return (
                <tr 
                  key={item._id} 
                  className="hover:bg-black/5 dark:hover:bg-white/[0.03] transition-colors group"
                >
                  {/* Employee Column (Admin view) */}
                  {isAdmin && (
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-zinc-800 dark:to-zinc-700 border border-slate-300 dark:border-white/10 flex items-center justify-center text-xs font-bold text-slate-800 dark:text-white shrink-0 shadow-inner">
                          {getInitials(empName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[140px]">
                              {empName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-zinc-300">
                              {empRole}
                            </span>
                          </div>
                          {empEmail && (
                            <span className="text-[11px] text-odizo-grey block truncate max-w-[160px]">
                              {empEmail}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Dates & Duration */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                        <Calendar size={13} className="text-odizo-red shrink-0" />
                        <span>{formatDisplayDate(item.startDate)}</span>
                        {item.endDate && (
                          <>
                            <ArrowRight size={11} className="text-odizo-grey" />
                            <span>{formatDisplayDate(item.endDate)}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[11px] text-odizo-grey font-medium mt-0.5">
                        Duration: <strong className="text-slate-800 dark:text-zinc-200">{duration} {duration === 1 ? 'day' : 'days'}</strong>
                      </span>
                    </div>
                  </td>

                  {/* Reason Summary */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-xs text-slate-600 dark:text-zinc-300 truncate max-w-[220px]" title={item.reason}>
                      {item.reason || 'No reason provided'}
                    </p>
                  </td>

                  {/* Applied On */}
                  <td className="py-3.5 px-4 text-xs text-odizo-grey">
                    {item.appliedOn ? formatDisplayDate(item.appliedOn) : 'N/A'}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        isApproved
                          ? 'bg-green-500/10 border-green-500/20 text-green-400'
                          : isRejected
                          ? 'bg-odizo-red/10 border-odizo-red/20 text-odizo-red'
                          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {isApproved && <Check size={11} />}
                      {isRejected && <X size={11} />}
                      {isPending && <Clock size={11} />}
                      <span>{item.status}</span>
                    </span>
                  </td>

                  {/* Actions Column */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* View Details Button */}
                      <button
                        onClick={() => onViewDetails(item)}
                        className="px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-odizo-red/10 dark:hover:bg-odizo-red/15 text-slate-900 dark:text-white hover:text-odizo-red border border-black/10 dark:border-white/10 hover:border-odizo-red/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        title="View Full Details"
                      >
                        <Eye size={14} className="text-odizo-red" />
                        <span>View Details</span>
                      </button>

                      {/* Admin Quick Action Buttons (Approve/Reject) */}
                      {isAdmin && isPending && (onApprove || onReject) && (
                        <div className="flex items-center gap-1 pl-1 border-l border-black/10 dark:border-white/10">
                          {onReject && (
                            <button
                              onClick={() => onReject(item._id)}
                              disabled={actionLoading}
                              title="Quick Reject"
                              className="p-1.5 rounded-lg bg-odizo-red/10 border border-odizo-red/25 hover:bg-odizo-red/20 text-odizo-red transition-all cursor-pointer disabled:opacity-50"
                            >
                              <X size={13} />
                            </button>
                          )}
                          {onApprove && (
                            <button
                              onClick={() => onApprove(item._id)}
                              disabled={actionLoading}
                              title="Quick Approve"
                              className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/25 hover:bg-green-500/20 text-green-400 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Check size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
