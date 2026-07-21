'use client';

import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  AlertCircle, 
  Home, 
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

export default function WFHRequestsPage() {
  const [currentUser, setCurrentUser] = useState<UserDetail | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRequests, setExpandedRequests] = useState<{ [key: string]: boolean }>({});
  
  // Rejection Modal states (Admin)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  
  // Apply WFH form states (Employee/Intern)
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

  const fetchRequests = async () => {
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
        // Filter WFH requests client-side
        const wfhOnly = data.leaves.filter((l: LeaveRequest) => l.requestType === 'WFH');
        if (currentUser.role !== 'Admin' && statusFilter !== 'All') {
          setRequests(wfhOnly.filter((l: LeaveRequest) => l.status === statusFilter));
        } else {
          setRequests(wfhOnly);
        }
      } else {
        setError(data.error || 'Failed to fetch WFH requests.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while fetching WFH requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser, statusFilter]);

  const toggleExpand = (id: string) => {
    setExpandedRequests((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleApprove = async (id: string) => {
    const confirmed = await showConfirm('Approve WFH', 'Are you sure you want to APPROVE this Work From Home request?');
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
        showSuccess('Approved!', 'WFH request has been approved.');
        fetchRequests();
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
    setSelectedRequestId(id);
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
      const res = await fetch(`/api/leaves/${selectedRequestId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', adminRemarks })
      });
      const data = await res.json();
      
      if (res.ok) {
        setShowRejectModal(false);
        showSuccess('Rejected', 'WFH request has been rejected.');
        fetchRequests();
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

  // Submit WFH Request form (Employee/Intern)
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
          requestType: 'WFH'
        })
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess('Submitted!', 'WFH request submitted successfully!');
        setFormSuccess('WFH request submitted successfully!');
        setApplyStartDate('');
        setApplyEndDate('');
        setApplyReason('');
        fetchRequests();
      } else {
        setFormError(data.error || 'Failed to submit WFH request.');
        showError('Submission Failed', data.error || 'Failed to submit WFH request.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Network error. Please try again.');
      showError('Error', 'Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Search filter
  const filteredRequests = requests.filter((req) => {
    const query = searchQuery.toLowerCase();
    return (
      req.userId?.name?.toLowerCase().includes(query) ||
      req.reason?.toLowerCase().includes(query) ||
      req._id?.toLowerCase().includes(query)
    );
  });

  const isAdmin = currentUser?.role === 'Admin';

  return (
    <div className="space-y-6">
      {/* Top Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Home className="text-odizo-red" size={24} />
            <span>WORK FROM HOME REQUESTS</span>
          </h1>
          <p className="text-sm text-odizo-grey mt-1">
            {isAdmin 
              ? 'Review and manage employee Work From Home (WFH) applications'
              : 'Submit and track your WFH applications for remote work validation'}
          </p>
        </div>

        {/* Global Refresh Button */}
        <button 
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-black/10 dark:border-white/10 hover:border-white/20 bg-black/5 dark:bg-white/3 hover:bg-black/5 dark:bg-white/5 text-xs text-slate-900 dark:text-white rounded-xl font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-odizo-red/10 border border-odizo-red/25 rounded-2xl p-4 text-sm text-odizo-red">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {isAdmin ? (
        /* ==================== ADMIN PORTAL VIEW ==================== */
        <div className="space-y-6">
          {/* Filters & Search Row */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
            {/* Status Filter Tabs */}
            <div className="flex bg-black/5 dark:bg-white/3 border border-black/5 dark:border-white/5 rounded-xl p-1 gap-1 self-start">
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                    statusFilter === status
                      ? 'bg-odizo-red text-slate-900 dark:text-white shadow-[0_0_10px_rgba(225,97,103,0.3)]'
                      : 'text-odizo-grey hover:text-slate-900 dark:text-white dark:hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative md:w-80">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-odizo-grey">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff or reason..."
                className="w-full bg-black/5 dark:bg-white/3 border border-black/5 dark:border-white/5 focus:border-white/15 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-odizo-grey focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Main Table */}
          {loading && filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
              <p className="mt-4 text-sm text-odizo-grey">Fetching WFH records...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center glass-card border-black/5 dark:border-white/5 p-8">
              <FileText className="text-odizo-grey/40 mb-4" size={48} />
              <h3 className="text-lg font-bold">No WFH Requests</h3>
              <p className="text-sm text-odizo-grey max-w-sm mt-1">There are no WFH requests matching criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRequests.map((req) => (
                <RequestCard
                  key={req._id}
                  id={req._id}
                  type="WFH"
                  employeeName={req.userId?.name || 'Unknown User'}
                  employeeRole={req.userId?.role || 'Employee'}
                  employeeEmail={req.userId?.email}
                  startDate={req.startDate}
                  endDate={req.endDate}
                  reason={req.reason}
                  status={req.status}
                  appliedOn={req.appliedOn}
                  details={req.adminRemarks ? `Admin Remarks: "${req.adminRemarks}"` : undefined}
                  showActions={true}
                  actionLoading={actionLoading}
                  onApprove={() => handleApprove(req._id)}
                  onReject={() => handleOpenRejectModal(req._id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ==================== EMPLOYEE / INTERN PORTAL ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Column 1: Apply WFH Form */}
          <div className="glass-card floating-shadow p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send size={18} className="text-odizo-red" />
              <span>Apply for WFH</span>
            </h2>
            <p className="text-xs text-odizo-grey">Request authorization to work remotely. Bypasses Wi-Fi and Geofence checks.</p>

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
                  placeholder="Describe your reason for requesting WFH..."
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none focus:ring-0 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-odizo-red hover:bg-odizo-red/90 text-slate-900 dark:text-white text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                {actionLoading ? 'Submitting...' : 'Submit WFH Request'}
              </button>
            </form>
          </div>

          {/* Column 2 & 3: WFH History List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filter */}
            <div className="flex justify-between items-center bg-black/5 dark:bg-white/3 border border-black/5 dark:border-white/5 p-4 rounded-2xl">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={16} className="text-odizo-red" />
                <span>WFH Request History</span>
              </h3>

              <div className="flex bg-black/5 dark:bg-white/3 border border-black/5 dark:border-white/5 rounded-xl p-1 gap-1">
                {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all duration-300 cursor-pointer ${
                      statusFilter === status
                        ? 'bg-odizo-red text-slate-900 dark:text-white shadow-[0_0_8px_rgba(225,97,103,0.3)]'
                        : 'text-odizo-grey hover:text-slate-900 dark:text-white dark:hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Table List */}
            {loading && requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="animate-spin text-odizo-red" size={32} />
                <span className="text-odizo-grey text-sm">Loading WFH history...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-3 bg-odizo-red/10 border border-odizo-red/25 rounded-2xl p-4 text-odizo-red">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center glass-card border-black/5 dark:border-white/5 p-8">
                <FileText className="text-odizo-grey/40 mb-4" size={48} />
                <h3 className="text-lg font-bold">No WFH Requests Found</h3>
                <p className="text-sm text-odizo-grey mt-1">You haven't submitted any WFH requests matching this filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRequests.map((req) => (
                  <RequestCard
                    key={req._id}
                    id={req._id}
                    type="WFH"
                    employeeName={currentUser?.name || 'Me'}
                    employeeRole={currentUser?.role || 'Employee'}
                    employeeEmail={currentUser?.email}
                    startDate={req.startDate}
                    endDate={req.endDate}
                    reason={req.reason}
                    status={req.status}
                    appliedOn={req.appliedOn}
                    details={req.adminRemarks ? `Admin Remarks: "${req.adminRemarks}"` : undefined}
                    showActions={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white/95 dark:bg-zinc-950/90 border border-slate-200 dark:border-white/10 rounded-2xl floating-shadow p-6 space-y-4 animate-float-in text-slate-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">Reject WFH Request</h3>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="p-1 rounded-lg text-odizo-grey hover:text-slate-900 dark:text-white dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5">Remarks / Reason for Rejection</label>
                <textarea
                  required
                  rows={4}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none focus:ring-0 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 border border-black/10 dark:border-white/10 hover:border-white/20 bg-black/5 dark:bg-white/3 hover:bg-black/5 dark:bg-white/5 text-xs text-slate-900 dark:text-white rounded-xl font-semibold transition-all duration-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-odizo-red hover:bg-odizo-red/90 text-xs text-slate-900 dark:text-white rounded-xl font-semibold transition-all duration-300 cursor-pointer"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
