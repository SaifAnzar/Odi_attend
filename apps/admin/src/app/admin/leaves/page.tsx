'use client';

import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  AlertCircle, 
  Calendar, 
  User, 
  Clock, 
  MessageSquare, 
  Filter, 
  Search, 
  FileText, 
  RefreshCw,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { showConfirm, showError, showSuccess } from '@/lib/swal';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { RequestCard } from '@/components/RequestCard';

interface UserDetail {
  _id: string;
  id?: string;
  name: string;
  role: 'Admin' | 'Employee' | 'Intern';
  email: string;
}

interface LeaveRequest {
  _id: string;
  userId: UserDetail;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestType: 'Leave' | 'WFH';
  adminRemarks: string;
  appliedOn: string;
}

const formatDBDate = (isoStr: string) => {
  return formatDisplayDate(isoStr);
};

const formatAppliedDate = (dateStr: string) => {
  return formatDisplayDate(dateStr);
};

const getDaysDiff = (startIso: string, endIso: string) => {
  if (!startIso || !endIso) return 0;
  const sDatePart = startIso.split('T')[0];
  const eDatePart = endIso.split('T')[0];
  const [sy, sm, sd] = sDatePart.split('-').map(Number);
  const [ey, em, ed] = eDatePart.split('-').map(Number);
  
  const sUTC = Date.UTC(sy, sm - 1, sd);
  const eUTC = Date.UTC(ey, em - 1, ed);
  const diffTime = Math.abs(eUTC - sUTC);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export default function LeaveRequestsPage() {
  const [currentUser, setCurrentUser] = useState<UserDetail | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLeaves, setExpandedLeaves] = useState<{ [key: string]: boolean }>({});
  
  // Rejection Modal states (Admin)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  
  // Apply Leave form states (Employee/Intern)
  const [applyStartDate, setApplyStartDate] = useState('');
  const [applyEndDate, setApplyEndDate] = useState('');
  const [applyReason, setApplyReason] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  // Load current user context
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedLeaves((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchLeaves = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError('');
      
      let url = '';
      if (currentUser.role === 'Admin') {
        url = statusFilter === 'All' ? '/api/leaves' : `/api/leaves?status=${statusFilter}`;
      } else {
        url = `/api/leaves/my?userId=${currentUser.id}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (res.ok && data.leaves) {
        // Filter out WFH requests client-side for the Leave page
        const leaveOnly = data.leaves.filter((l: LeaveRequest) => !l.requestType || l.requestType === 'Leave');
        if (currentUser.role !== 'Admin' && statusFilter !== 'All') {
          setLeaves(leaveOnly.filter((l: LeaveRequest) => l.status === statusFilter));
        } else {
          setLeaves(leaveOnly);
        }
      } else {
        setError(data.error || 'Failed to fetch leave requests.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while fetching leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchLeaves();
    }
  }, [currentUser, statusFilter]);

  const handleApprove = async (id: string) => {
    const confirmed = await showConfirm('Approve Leave', 'Are you sure you want to APPROVE this leave request?');
    if (!confirmed) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/leaves/${id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved' })
      });
      const data = await res.json();
      
      if (res.ok) {
        showSuccess('Approved!', 'Leave request has been approved.');
        fetchLeaves();
      } else {
        showError('Approval Failed', data.error || 'Failed to approve request.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRejectModal = (id: string) => {
    setSelectedLeaveId(id);
    setAdminRemarks('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminRemarks.trim()) {
      showError('Required Field', 'Please provide remarks/reason for rejection.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/leaves/${selectedLeaveId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', adminRemarks })
      });
      const data = await res.json();
      
      if (res.ok) {
        setShowRejectModal(false);
        showSuccess('Rejected', 'Leave request has been rejected.');
        fetchLeaves();
      } else {
        showError('Rejection Failed', data.error || 'Failed to reject request.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Leave Request form (Employee/Intern)
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!applyStartDate || !applyEndDate || !applyReason.trim()) {
      setFormError('All fields are required.');
      return;
    }

    const sDate = new Date(applyStartDate);
    const eDate = new Date(applyEndDate);

    if (sDate > eDate) {
      setFormError('Start date cannot be after end date.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?._id,
          startDate: applyStartDate,
          endDate: applyEndDate,
          reason: applyReason,
          requestType: 'Leave'
        })
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess('Submitted!', 'Leave request submitted successfully!');
        setFormSuccess('Leave request submitted successfully!');
        setApplyStartDate('');
        setApplyEndDate('');
        setApplyReason('');
        fetchLeaves();
      } else {
        setFormError(data.error || 'Failed to submit leave request.');
        showError('Submission Failed', data.error || 'Failed to submit leave request.');
      }
    } catch (err) {
      console.error(err);
      setFormError('An error occurred. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredLeaves = leaves.filter(l => {
    const employeeName = l.userId?.name?.toLowerCase() || '';
    const email = l.userId?.email?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return employeeName.includes(query) || email.includes(query);
  });

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/5 dark:border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-sm text-odizo-grey">
            {currentUser?.role === 'Admin'
              ? 'Review, Approve or Reject ODIZO team time-off requests.'
              : 'Apply for leaves and track your approval status.'}
          </p>
        </div>
        <button 
          onClick={fetchLeaves}
          className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {currentUser?.role === 'Admin' ? (
        /* ==================== ADMIN DASHBOARD ==================== */
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5">
            {/* Status filter buttons */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-odizo-red border border-odizo-red/20 text-slate-900 dark:text-white shadow-[0_0_15px_rgba(225,97,103,0.3)]'
                      : 'bg-black/5 dark:bg-white/5 text-odizo-grey hover:text-slate-900 dark:text-white dark:hover:text-white border border-transparent hover:bg-black/5 dark:bg-white/10'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Search bar */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by employee name..."
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none focus:ring-0"
              />
              <Search className="absolute left-3.5 top-3.5 text-odizo-grey" size={16} />
            </div>
          </div>

          {/* Main Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="animate-spin text-odizo-red" size={32} />
              <span className="text-odizo-grey text-sm">Loading leave data...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 bg-odizo-red/10 border border-odizo-red/25 rounded-2xl p-4 text-odizo-red">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center glass-card border-black/5 dark:border-white/5 p-8">
              <FileText className="text-odizo-grey/40 mb-4" size={48} />
              <h3 className="text-lg font-bold">No Leave Requests</h3>
              <p className="text-sm text-odizo-grey max-w-sm mt-1">There are no leave requests matching criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLeaves.map((leave) => (
                <RequestCard
                  key={leave._id}
                  id={leave._id}
                  type="Leave"
                  employeeName={leave.userId?.name || 'Unknown User'}
                  employeeRole={leave.userId?.role || 'Employee'}
                  employeeEmail={leave.userId?.email}
                  startDate={leave.startDate}
                  endDate={leave.endDate}
                  reason={leave.reason}
                  status={leave.status}
                  appliedOn={leave.appliedOn}
                  details={leave.adminRemarks ? `Admin Remarks: "${leave.adminRemarks}"` : undefined}
                  showActions={true}
                  actionLoading={actionLoading}
                  onApprove={() => handleApprove(leave._id)}
                  onReject={() => handleOpenRejectModal(leave._id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ==================== EMPLOYEE / INTERN PORTAL ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Column 1: Apply Leave Form */}
          <div className="glass-card floating-shadow p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send size={18} className="text-odizo-red" />
              <span>Apply for Leave</span>
            </h2>
            <p className="text-xs text-odizo-grey">Request off-duty hours. Your request will be evaluated by an Admin.</p>

            {formError && (
              <div className="flex items-center gap-2 bg-odizo-red/10 border border-odizo-red/25 rounded-xl p-3 text-xs text-odizo-red">
                <AlertCircle size={14} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-xl p-3 text-xs text-green-400">
                <Check size={14} />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5">Start Date</label>
                <input
                  type="date"
                  required
                  value={applyStartDate}
                  onChange={(e) => setApplyStartDate(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none focus:ring-0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5">End Date</label>
                <input
                  type="date"
                  required
                  value={applyEndDate}
                  onChange={(e) => setApplyEndDate(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none focus:ring-0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5">Reason</label>
                <textarea
                  required
                  rows={3}
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  placeholder="Describe your reason for requesting leave..."
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none focus:ring-0 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-odizo-red hover:bg-odizo-red/90 text-slate-900 dark:text-white text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                {actionLoading ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </form>
          </div>

          {/* Column 2 & 3: Leave History List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filter */}
            <div className="flex justify-between items-center bg-black/5 dark:bg-white/3 border border-black/5 dark:border-white/5 p-4 rounded-2xl">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={16} className="text-odizo-red" />
                <span>Leave Request History</span>
              </h3>

              <div className="flex bg-black/5 dark:bg-white/3 border border-black/5 dark:border-white/5 rounded-xl p-1 gap-1">
                {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all duration-300 cursor-pointer ${
                      statusFilter === filter
                        ? 'bg-odizo-red text-slate-900 dark:text-white shadow-[0_0_8px_rgba(225,97,103,0.3)]'
                        : 'text-odizo-grey hover:text-slate-900 dark:text-white dark:hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Table List */}
            {loading && leaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="animate-spin text-odizo-red" size={32} />
                <span className="text-odizo-grey text-sm">Loading leave history...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-3 bg-odizo-red/10 border border-odizo-red/25 rounded-2xl p-4 text-odizo-red">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center glass-card border-black/5 dark:border-white/5 p-8">
                <FileText className="text-odizo-grey/40 mb-4" size={48} />
                <h3 className="text-lg font-bold">No Leave Requests Found</h3>
                <p className="text-sm text-odizo-grey mt-1">You haven't submitted any leave requests matching this filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredLeaves.map((leave) => (
                  <RequestCard
                    key={leave._id}
                    id={leave._id}
                    type="Leave"
                    employeeName={currentUser?.name || 'Me'}
                    employeeRole={currentUser?.role || 'Employee'}
                    employeeEmail={currentUser?.email}
                    startDate={leave.startDate}
                    endDate={leave.endDate}
                    reason={leave.reason}
                    status={leave.status}
                    appliedOn={leave.appliedOn}
                    details={leave.adminRemarks ? `Admin Remarks: "${leave.adminRemarks}"` : undefined}
                    showActions={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom sliding glass reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
          <div className="w-full max-w-md glass-card border-black/10 dark:border-white/10 floating-shadow-red p-6 animate-float">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 mb-5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Reject Leave Request</h2>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="p-1 rounded-lg text-odizo-grey hover:text-slate-900 dark:text-white dark:hover:text-white hover:bg-black/5 dark:bg-white/5 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5">
                  Admin Remarks (Rejection Reason)
                </label>
                <textarea
                  required
                  rows={4}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Provide a reason for rejecting this leave request..."
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none focus:ring-0 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2.5 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white hover:bg-black/5 dark:bg-white/5 text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-odizo-red hover:bg-odizo-red/90 text-slate-900 dark:text-white text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
