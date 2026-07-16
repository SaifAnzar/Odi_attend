'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, X, User, Calendar, MessageSquare, AlertCircle, FileText } from 'lucide-react';
import { showError, showSuccess, showConfirm } from '@/lib/swal';

interface UserDetail {
  _id: string;
  name: string;
  email: string;
  role: string;
  shift: {
    name: string;
    startTime: string;
    endTime: string;
  };
}

interface SwapRequest {
  _id: string;
  requesterId: UserDetail;
  targetUserId: UserDetail;
  swapDate: string;
  status: 'Pending Target' | 'Pending Admin' | 'Approved' | 'Rejected';
  adminRemarks: string;
  createdAt: string;
}

const formatDate = (isoStr: string) => {
  if (!isoStr) return '';
  const datePart = isoStr.split('T')[0];
  const [y, m, d] = datePart.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
};

export default function ShiftSwapsAdminPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  
  // Rejection modal (Admin)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSwapId, setSelectedSwapId] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');

  // Employee/Intern states
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [targetColleagueId, setTargetColleagueId] = useState('');
  const [swapDate, setSwapDate] = useState('');
  const [submittingSwap, setSubmittingSwap] = useState(false);
  const [employeeTab, setEmployeeTab] = useState<'incoming' | 'outgoing' | 'create'>('incoming');

  const fetchSwaps = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/swaps');
      const data = await res.json();
      if (res.ok && data.swaps) {
        setSwaps(data.swaps);
      } else {
        showError('Error', data.error || 'Failed to fetch shift swaps.');
      }
    } catch (e) {
      console.error(e);
      showError('Error', 'Could not load shift swaps.');
    } finally {
      setLoading(false);
    }
  };

  const fetchColleagues = async () => {
    try {
      const res = await fetch('/api/users/colleagues');
      const data = await res.json();
      if (res.ok && data.colleagues) {
        setColleagues(data.colleagues);
      }
    } catch (err) {
      console.error('Fetch colleagues error:', err);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchSwaps();
      if (currentUser.role !== 'Admin') {
        fetchColleagues();
      }
    }
  }, [currentUser]);

  // Admin approval handlers
  const handleApprove = async (id: string) => {
    const confirmed = await showConfirm('Approve Swap', 'Are you sure you want to APPROVE this shift swap? Both employees\' schedules will be swapped for the selected date.');
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/swaps/${id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved' })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess('Approved!', 'Shift swap request approved successfully.');
        fetchSwaps();
      } else {
        showError('Approval Failed', data.error || 'Failed to approve swap.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClick = (id: string) => {
    setSelectedSwapId(id);
    setAdminRemarks('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminRemarks.trim()) {
      showError('Required', 'Please enter a reason for rejecting the swap request.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/swaps/${selectedSwapId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', adminRemarks })
      });
      const data = await res.json();
      if (res.ok) {
        setShowRejectModal(false);
        showSuccess('Rejected', 'Shift swap request has been rejected.');
        fetchSwaps();
      } else {
        showError('Rejection Failed', data.error || 'Failed to reject swap.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Employee actions
  const handleCreateSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetColleagueId) {
      showError('Error', 'Please select a colleague to swap shifts with.');
      return;
    }
    if (!swapDate) {
      showError('Error', 'Please select a date for the shift swap.');
      return;
    }

    try {
      setSubmittingSwap(true);
      const res = await fetch('/api/swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetColleagueId,
          swapDate
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess('Success', 'Shift swap request submitted successfully.');
        setTargetColleagueId('');
        setSwapDate('');
        fetchSwaps();
        setEmployeeTab('outgoing'); // Switch to outgoing requests to track status
      } else {
        showError('Request Failed', data.error || 'Failed to submit shift swap.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred.');
    } finally {
      setSubmittingSwap(false);
    }
  };

  const handleReviewSwap = async (swapId: string, status: 'Pending Admin' | 'Rejected') => {
    const confirmed = await showConfirm(
      status === 'Pending Admin' ? 'Accept Swap' : 'Decline Swap',
      status === 'Pending Admin' 
        ? 'Are you sure you want to ACCEPT this shift swap request? It will be sent to the Admin for final approval.' 
        : 'Are you sure you want to DECLINE this shift swap request?'
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/swaps/${swapId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(
          status === 'Pending Admin' ? 'Accepted!' : 'Declined',
          status === 'Pending Admin' ? 'Swap request accepted! Pending Admin final approval.' : 'Swap request declined.'
        );
        fetchSwaps();
      } else {
        showError('Action Failed', data.error || 'Failed to review shift swap.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'Admin';
  const currentUserId = currentUser.id || currentUser._id;
  const getUserId = (userObj: any) => userObj?._id || userObj?.id || userObj;

  // Filter helper functions for Employee UI
  const incomingSwaps = swaps.filter(s => getUserId(s.targetUserId) === currentUserId && s.status === 'Pending Target');
  const outgoingSwaps = swaps.filter(s => getUserId(s.requesterId) === currentUserId);

  if (!isAdmin) {
    /* ================= EMPLOYEE / INTERN DASHBOARD VIEW ================= */
    return (
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-odizo-grey to-slate-900 dark:from-white dark:via-odizo-grey dark:to-white bg-clip-text text-transparent">
            Shift Swapping
          </h1>
          <p className="text-sm text-odizo-grey mt-1">
            Request shift swaps with colleagues and respond to incoming requests
          </p>
        </div>

        {/* Tab Selectors */}
        <div className="flex gap-4 border-b border-black/5 dark:border-white/5 pb-px">
          <button
            onClick={() => setEmployeeTab('incoming')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              employeeTab === 'incoming'
                ? 'border-odizo-red text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-odizo-grey hover:text-slate-900 dark:text-white'
            }`}
          >
            Incoming Requests ({incomingSwaps.length})
          </button>
          <button
            onClick={() => setEmployeeTab('outgoing')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              employeeTab === 'outgoing'
                ? 'border-odizo-red text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-odizo-grey hover:text-slate-900 dark:text-white'
            }`}
          >
            My Outgoing Swaps ({outgoingSwaps.length})
          </button>
          <button
            onClick={() => setEmployeeTab('create')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              employeeTab === 'create'
                ? 'border-odizo-red text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-odizo-grey hover:text-slate-900 dark:text-white'
            }`}
          >
            Request Shift Swap
          </button>
        </div>

        {/* Tab Contents */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
            <p className="mt-4 text-sm text-odizo-grey">Loading shift swaps...</p>
          </div>
        ) : employeeTab === 'incoming' ? (
          /* Incoming Requests */
          <div className="glass-card p-6 floating-shadow border-black/5 dark:border-white/5">
            {incomingSwaps.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
                <RefreshCw size={40} className="mx-auto text-odizo-grey/50 mb-3" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">No incoming swap requests</p>
                <p className="text-xs text-odizo-grey mt-1">Colleague requests to swap shifts with you will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/5 text-odizo-grey font-medium text-xs uppercase">
                      <th className="py-3 px-4">Swap Date</th>
                      <th className="py-3 px-4">From Colleague</th>
                      <th className="py-3 px-4">Colleague Shift</th>
                      <th className="py-3 px-4">Your Shift</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10 dark:divide-black/10 dark:divide-white/5">
                    {incomingSwaps.map((swap) => (
                      <tr key={swap._id} className="hover:bg-black/5 dark:bg-white/3 transition-colors">
                        <td className="py-4 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-odizo-red" />
                            <span>{formatDate(swap.swapDate)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                          <span>{swap.requesterId?.name || 'Unknown'}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{swap.requesterId?.shift?.name || 'Standard'}</span>
                            <span className="text-[10px] text-odizo-grey">{swap.requesterId?.shift?.startTime} - {swap.requesterId?.shift?.endTime}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{swap.targetUserId?.shift?.name || 'Standard'}</span>
                            <span className="text-[10px] text-odizo-grey">{swap.targetUserId?.shift?.startTime} - {swap.targetUserId?.shift?.endTime}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleReviewSwap(swap._id, 'Pending Admin')}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleReviewSwap(swap._id, 'Rejected')}
                              className="px-3 py-1.5 bg-odizo-red/10 hover:bg-odizo-red/20 border border-odizo-red/20 hover:border-odizo-red/40 text-odizo-red rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : employeeTab === 'outgoing' ? (
          /* My Outgoing Swaps */
          <div className="glass-card p-6 floating-shadow border-black/5 dark:border-white/5">
            {outgoingSwaps.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
                <FileText size={40} className="mx-auto text-odizo-grey/50 mb-3" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">No outgoing requests</p>
                <p className="text-xs text-odizo-grey mt-1">You haven't requested any shift swaps yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/5 text-odizo-grey font-medium text-xs uppercase">
                      <th className="py-3 px-4">Swap Date</th>
                      <th className="py-3 px-4">Colleague</th>
                      <th className="py-3 px-4">Colleague Shift</th>
                      <th className="py-3 px-4">Your Shift</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Admin Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10 dark:divide-black/10 dark:divide-white/5">
                    {outgoingSwaps.map((swap) => {
                      let badgeColor = 'bg-black/5 dark:bg-white/5 text-odizo-grey border border-black/10 dark:border-white/10';
                      let statusText: string = swap.status;
                      if (swap.status === 'Approved') {
                        badgeColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                      } else if (swap.status === 'Rejected') {
                        badgeColor = 'bg-odizo-red/10 text-odizo-red border border-odizo-red/20';
                      } else if (swap.status === 'Pending Admin') {
                        badgeColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse';
                        statusText = 'Pending Admin';
                      } else if (swap.status === 'Pending Target') {
                        badgeColor = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                        statusText = 'Waiting on Colleague';
                      }

                      return (
                        <tr key={swap._id} className="hover:bg-black/5 dark:bg-white/3 transition-colors">
                          <td className="py-4 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-odizo-red" />
                              <span>{formatDate(swap.swapDate)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                            <span>{swap.targetUserId?.name || 'Unknown'}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{swap.targetUserId?.shift?.name || 'Standard'}</span>
                              <span className="text-[10px] text-odizo-grey">{swap.targetUserId?.shift?.startTime} - {swap.targetUserId?.shift?.endTime}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{swap.requesterId?.shift?.name || 'Standard'}</span>
                              <span className="text-[10px] text-odizo-grey">{swap.requesterId?.shift?.startTime} - {swap.requesterId?.shift?.endTime}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeColor}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs text-odizo-grey max-w-xs truncate">
                            {swap.adminRemarks || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Request Swap Form */
          <div className="glass-card p-6 floating-shadow border-black/5 dark:border-white/5 max-w-xl">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">New Shift Swap Request</h3>
            <form onSubmit={handleCreateSwap} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey">
                  Select Colleague to Swap With
                </label>
                <select
                  required
                  value={targetColleagueId}
                  onChange={(e) => setTargetColleagueId(e.target.value)}
                  className="w-full bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none transition-colors"
                >
                  <option value="">-- Choose a colleague --</option>
                  {colleagues.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.email}) - {c.shift?.name} ({c.shift?.startTime || '00:00'}-{c.shift?.endTime || '00:00'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey">
                  Select Swap Date
                </label>
                <input
                  type="date"
                  required
                  value={swapDate}
                  onChange={(e) => setSwapDate(e.target.value)}
                  className="w-full bg-black border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submittingSwap}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-odizo-red hover:bg-odizo-red/80 text-slate-900 dark:text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {submittingSwap ? 'Submitting...' : 'Submit Swap Request'}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  /* ================= ADMIN MANAGEMENT VIEW ================= */
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-odizo-grey to-slate-900 dark:from-white dark:via-odizo-grey dark:to-white bg-clip-text text-transparent">
          Shift Swaps Approval
        </h1>
        <p className="text-sm text-odizo-grey mt-1">
          Review and authorize peer-to-peer shift swaps agreed upon by employees
        </p>
      </div>

      {/* Tab Selectors */}
      <div className="flex gap-4 border-b border-black/5 dark:border-white/5 pb-px">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'border-odizo-red text-slate-900 dark:text-white font-bold'
              : 'border-transparent text-odizo-grey hover:text-slate-900 dark:text-white'
          }`}
        >
          Pending Decisions ({swaps.filter(s => s.status === 'Pending Admin').length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'border-odizo-red text-slate-900 dark:text-white font-bold'
              : 'border-transparent text-odizo-grey hover:text-slate-900 dark:text-white'
          }`}
        >
          All Requests Tracker ({swaps.length})
        </button>
      </div>

      {/* Main Content */}
      <div className="glass-card p-6 floating-shadow border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4 mb-6">
          <div className="p-2 bg-odizo-red/10 border border-odizo-red/20 text-odizo-red rounded-lg">
            <RefreshCw size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">
              {activeTab === 'pending' ? 'Pending Final Decisions' : 'All Swap Requests Log'}
            </h3>
            <p className="text-xs text-odizo-grey">
              {activeTab === 'pending' 
                ? 'These swaps have mutual agreement and require final Admin override.' 
                : 'Full history of requested shifts swaps and their current real-time progress.'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
            <p className="mt-4 text-sm text-odizo-grey">Fetching swap requests...</p>
          </div>
        ) : (activeTab === 'pending' ? swaps.filter(s => s.status === 'Pending Admin') : swaps).length === 0 ? (
          <div className="text-center py-16 border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
            <FileText size={40} className="mx-auto text-odizo-grey/50 mb-3" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">No swaps found in this list</p>
            <p className="text-xs text-odizo-grey mt-1">
              {activeTab === 'pending' 
                ? 'Any shift swap accepted by both peers will appear here.' 
                : 'No shift swap requests have been filed yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5 text-odizo-grey font-medium text-xs uppercase">
                  <th className="py-3 px-4">Swap Date</th>
                  <th className="py-3 px-4">Requester</th>
                  <th className="py-3 px-4">Target Colleague</th>
                  <th className="py-3 px-4">Requester Shift</th>
                  <th className="py-3 px-4">Colleague Shift</th>
                  <th className="py-3 px-4 text-right">
                    {activeTab === 'pending' ? 'Actions' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-black/10 dark:divide-white/5">
                {(activeTab === 'pending' ? swaps.filter(s => s.status === 'Pending Admin') : swaps).map((swap) => (
                  <tr key={swap._id} className="hover:bg-black/5 dark:bg-white/3 transition-colors">
                    <td className="py-4 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-odizo-red" />
                        <span>{formatDate(swap.swapDate)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>{swap.requesterId?.name || 'Unknown'}</span>
                        <span className="text-xs text-odizo-grey font-normal">{swap.requesterId?.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>{swap.targetUserId?.name || 'Unknown'}</span>
                        <span className="text-xs text-odizo-grey font-normal">{swap.targetUserId?.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{swap.requesterId?.shift?.name || 'Standard'}</span>
                        <span className="text-[10px] text-odizo-grey">{swap.requesterId?.shift?.startTime} - {swap.requesterId?.shift?.endTime}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{swap.targetUserId?.shift?.name || 'Standard'}</span>
                        <span className="text-[10px] text-odizo-grey">{swap.targetUserId?.shift?.startTime} - {swap.targetUserId?.shift?.endTime}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {activeTab === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={actionLoading}
                            onClick={() => handleApprove(swap._id)}
                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                            title="Approve & Swap Shifts"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleRejectClick(swap._id)}
                            className="p-1.5 bg-odizo-red/10 hover:bg-odizo-red/20 border border-odizo-red/20 hover:border-odizo-red/40 text-odizo-red rounded-lg transition-all cursor-pointer disabled:opacity-50"
                            title="Reject"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          swap.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : swap.status === 'Rejected'
                              ? 'bg-odizo-red/10 text-odizo-red border border-odizo-red/20'
                              : swap.status === 'Pending Admin'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                : 'bg-black/5 dark:bg-white/5 text-odizo-grey border border-black/10 dark:border-white/10'
                        }`}>
                          {swap.status === 'Pending Target' ? 'Waiting on Colleague' : swap.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rejection Remarks Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-card p-6 floating-shadow border-black/10 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2 text-odizo-red">
                <AlertCircle size={18} />
                <h3 className="font-bold text-slate-900 dark:text-white">Decline Shift Swap</h3>
              </div>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="text-odizo-grey hover:text-slate-900 dark:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey">
                  Decline Remarks (Colleagues will see this reason)
                </label>
                <textarea
                  required
                  rows={3}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Provide the reason for rejecting this swap (e.g. Schedule conflicts, resource constraints)..."
                  className="w-full bg-black/5 dark:bg-white/3 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-odizo-grey hover:text-slate-900 dark:text-white transition-colors border border-transparent rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-odizo-red hover:bg-odizo-red/80 text-slate-900 dark:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  Decline Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
