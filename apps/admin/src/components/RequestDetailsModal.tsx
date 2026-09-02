'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar, 
  User, 
  Clock, 
  Check, 
  AlertCircle, 
  FileText, 
  MessageSquare, 
  Home,
  ArrowRight
} from 'lucide-react';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { EmployeeQuickStats } from '@/components/ui/EmployeeQuickStats';

export interface UserDetail {
  _id?: string;
  id?: string;
  name?: string;
  role?: 'Admin' | 'Employee' | 'Intern' | string;
  email?: string;
}

export interface RequestItem {
  _id: string;
  userId?: UserDetail;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  requestType?: 'Leave' | 'WFH' | string;
  adminRemarks?: string;
  appliedOn?: string;
}

interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RequestItem | null;
  isAdmin?: boolean;
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

export function RequestDetailsModal({
  isOpen,
  onClose,
  request,
  isAdmin = false,
  onApprove,
  onReject,
  actionLoading = false,
}: RequestDetailsModalProps) {
  const [stats, setStats] = React.useState({ leaveCount: 0, wfhCount: 0, swapCount: 0 });
  const [statsLoading, setStatsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen || !request || !request.userId || !isAdmin) return;
    
    const employeeId = request.userId._id || request.userId.id;
    if (!employeeId) return;

    let active = true;

    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        // Fetch leaves
        const leavesRes = await fetch(`/api/leaves/my?userId=${employeeId}`);
        // Fetch swaps
        const swapsRes = await fetch('/api/swaps');
        
        let leaveCount = 0;
        let wfhCount = 0;
        let swapCount = 0;

        if (leavesRes.ok) {
          const data = await leavesRes.json();
          if (data.leaves) {
            leaveCount = data.leaves.filter((l: any) => l.requestType === 'Leave').length;
            wfhCount = data.leaves.filter((l: any) => l.requestType === 'WFH').length;
          }
        }
        
        if (swapsRes.ok) {
          const data = await swapsRes.json();
          if (data.swaps) {
            swapCount = data.swaps.filter(
              (s: any) => 
                (s.requesterId?._id === employeeId || s.targetUserId?._id === employeeId)
            ).length;
          }
        }

        if (active) {
          setStats({ leaveCount, wfhCount, swapCount });
        }
      } catch (err) {
        console.error('Failed to fetch employee stats:', err);
      } finally {
        if (active) {
          setStatsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      active = false;
    };
  }, [isOpen, request, isAdmin]);

  if (!isOpen || !request) return null;

  const isWFH = request.requestType === 'WFH';
  const duration = getDaysDiff(request.startDate, request.endDate);
  const employeeName = request.userId?.name || 'Unknown User';
  const employeeRole = request.userId?.role || 'Employee';
  const employeeEmail = request.userId?.email || 'N/A';

  // Status Badge styles
  const isPending = request.status === 'Pending' || request.status === 'Pending Admin';
  const isApproved = request.status === 'Approved';
  const isRejected = request.status === 'Rejected';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-white/95 dark:bg-zinc-950/90 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-white my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              {isWFH ? (
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Home size={18} />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-odizo-red/10 border border-odizo-red/20 text-odizo-red">
                  <Calendar size={18} />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold tracking-tight">
                  {isWFH ? 'Work From Home Details' : 'Leave Request Details'}
                </h3>
                <p className="text-[11px] text-odizo-grey">ODIZO Attendance System</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-odizo-grey hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5">
            {/* Status & Type Bar */}
            <div className="flex items-center justify-between bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 p-3 rounded-xl">
              <span className="text-xs font-semibold text-odizo-grey uppercase tracking-wider">
                Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  isApproved
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : isRejected
                    ? 'bg-odizo-red/10 border-odizo-red/20 text-odizo-red'
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                }`}
              >
                {isApproved && <Check size={12} />}
                {isRejected && <X size={12} />}
                {isPending && <Clock size={12} />}
                {request.status}
              </span>
            </div>

            {/* Employee Section */}
            <div className="flex items-center gap-3.5 p-3.5 bg-slate-50/80 dark:bg-black/25 border border-slate-200/60 dark:border-white/5 rounded-xl">
              <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-zinc-800 dark:to-zinc-700 border border-slate-300 dark:border-white/15 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-white shrink-0 shadow-inner">
                {getInitials(employeeName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {employeeName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-zinc-300">
                    {employeeRole}
                  </span>
                </div>
                <p className="text-xs text-odizo-grey truncate mt-0.5">{employeeEmail}</p>
              </div>
            </div>

            {/* Quick Stats Summary for Admin */}
            {isAdmin && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-odizo-grey uppercase tracking-wider block">
                  Employee Activity Summary
                </span>
                {statsLoading ? (
                  <div className="grid grid-cols-3 gap-4 w-full">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-[74px] bg-black/10 dark:bg-white/5 animate-pulse rounded-2xl border border-black/5 dark:border-white/10"></div>
                    ))}
                  </div>
                ) : (
                  <EmployeeQuickStats 
                    leaveCount={stats.leaveCount} 
                    wfhCount={stats.wfhCount} 
                    swapCount={stats.swapCount} 
                  />
                )}
              </div>
            )}

            {/* Date Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50/80 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 rounded-xl">
                <span className="text-[10px] font-bold text-odizo-grey uppercase tracking-wider block mb-1">
                  Start Date
                </span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                  <Calendar size={14} className="text-odizo-red" />
                  <span>{formatDisplayDate(request.startDate)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 rounded-xl">
                <span className="text-[10px] font-bold text-odizo-grey uppercase tracking-wider block mb-1">
                  End Date
                </span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                  <Calendar size={14} className="text-odizo-red" />
                  <span>{formatDisplayDate(request.endDate)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 rounded-xl">
                <span className="text-[10px] font-bold text-odizo-grey uppercase tracking-wider block mb-1">
                  Total Duration
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {duration} {duration === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              <div className="p-3 bg-slate-50/80 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 rounded-xl">
                <span className="text-[10px] font-bold text-odizo-grey uppercase tracking-wider block mb-1">
                  Applied On
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-zinc-300">
                  {request.appliedOn ? formatDisplayDate(request.appliedOn) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Reason Section */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-odizo-grey uppercase tracking-wider block">
                Reason for Application
              </label>
              <div className="p-3.5 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-xl text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {request.reason || 'No reason provided.'}
              </div>
            </div>

            {/* Admin Remarks Section */}
            {request.adminRemarks && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare size={12} />
                  <span>Admin Remarks</span>
                </label>
                <div className="p-3.5 bg-blue-50/60 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 rounded-xl text-xs text-blue-900 dark:text-blue-200 italic">
                  "{request.adminRemarks}"
                </div>
              </div>
            )}
          </div>

          {/* Footer & Actions */}
          <div className="px-6 py-4 border-t border-black/5 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-end gap-3">
            {isAdmin && isPending && (onApprove || onReject) ? (
              <>
                {onReject && (
                  <button
                    onClick={() => {
                      onClose();
                      onReject(request._id);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-odizo-red/30 hover:border-odizo-red/60 bg-odizo-red/10 hover:bg-odizo-red/20 text-odizo-red text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <X size={14} />
                    <span>Reject</span>
                  </button>
                )}
                {onApprove && (
                  <button
                    onClick={async () => {
                      await onApprove(request._id);
                      onClose();
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-slate-900 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-green-500/20"
                  >
                    {actionLoading ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>Approve</span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-semibold text-slate-800 dark:text-white rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
