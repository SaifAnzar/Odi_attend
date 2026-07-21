'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  User as UserIcon, 
  Search, 
  MapPin, 
  Download, 
  Check, 
  X, 
  ShieldAlert, 
  Home, 
  ChevronDown, 
  ChevronUp, 
  ClipboardList, 
  Eye, 
  ExternalLink,
  Clock
} from 'lucide-react';
import { showError, showSuccess } from '@/lib/swal';
import { formatDisplayDate } from '@/lib/dateFormatter';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Employee' | 'Intern';
  status: 'Active' | 'Inactive';
}

interface PunchSession {
  checkIn: string;
  checkOut?: string;
  checkInLocation: { latitude: number; longitude: number; address?: string };
  checkOutLocation?: { latitude: number; longitude: number; address?: string };
}

interface AttendanceRecord {
  _id: string;
  userId: User;
  date: string;
  shiftSnapshot: {
    name: string;
    startTime: string;
    endTime: string;
  };
  sessions: PunchSession[];
  attendanceStatus: 'Present' | 'Absent' | 'Late' | 'Half-Day' | 'Off-Day';
  totalMinutesWorked: number;
  isFlagged: boolean;
  flagReason?: string;
  isWFH: boolean;
  status: 'Approved' | 'Pending Approval' | 'Rejected';
  completedTasks?: string[];
}

export default function Reports() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Details Drawer State
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Filters
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const handleReview = async (recordId: string, approvalStatus: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch(`/api/attendance/${recordId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: approvalStatus })
      });
      if (res.ok) {
        showSuccess('Review Saved', `Attendance record has been ${approvalStatus.toLowerCase()}.`);
        fetchData();
        // If drawer is open and showing the active record, update it or close it
        if (selectedRecord && selectedRecord._id === recordId) {
          setIsDrawerOpen(false);
          setSelectedRecord(null);
        }
      } else {
        const err = await res.json();
        showError('Review Failed', err.error || 'Failed to submit review.');
      }
    } catch (e) {
      console.error(e);
      showError('Network Error', 'Failed to review record.');
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const storedUser = localStorage.getItem('user');
      let userIdToQuery = selectedUserId;
      let isEmployee = false;
      
      if (storedUser) {
        const u = JSON.parse(storedUser) as User;
        if (u.role !== 'Admin') {
          userIdToQuery = u._id;
          isEmployee = true;
        }
      }

      if (!isEmployee) {
        // Fetch users for the dropdown (Admin only)
        const usersRes = await fetch('/api/users');
        const usersData = await usersRes.json();
        if (usersData.users) {
          setUsers(usersData.users.filter((u: User) => u.role !== 'Admin'));
        }
      }

      // Fetch logs based on filters
      let url = '/api/attendance?';
      if (userIdToQuery) url += `userId=${userIdToQuery}&`;
      if (selectedDate) url += `date=${selectedDate}&`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.records) {
        setRecords(data.records);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedUserId, selectedDate, currentUser]);

  const handleExportCSV = () => {
    if (records.length === 0) return;
    
    // Construct CSV content
    const headers = ['Date', 'Staff Name', 'Email', 'Role', 'Shift Name', 'Shift Start', 'Shift End', 'Minutes Worked', 'Attendance Status', 'Verification Status', 'Flagged', 'Flag Reason', 'Work From Home'];
    const rows = records.map(r => [
      r.date,
      r.userId?.name || 'Unknown',
      r.userId?.email || '',
      r.userId?.role || '',
      r.shiftSnapshot?.name || '',
      r.shiftSnapshot?.startTime || '',
      r.shiftSnapshot?.endTime || '',
      r.totalMinutesWorked,
      r.attendanceStatus,
      r.status,
      r.isFlagged ? 'Yes' : 'No',
      r.flagReason || '',
      r.isWFH ? 'Yes' : 'No'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${selectedDate || 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
  };

  const getTimingsSummary = (record: AttendanceRecord) => {
    if (!record.sessions || record.sessions.length === 0) return { main: 'Absent', sub: null };
    const first = record.sessions[0];
    const last = record.sessions[record.sessions.length - 1];
    
    const inTime = new Date(first.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let outTime = 'Active';
    if (last.checkOut) {
      outTime = new Date(last.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return {
      main: `${inTime} - ${outTime}`,
      sub: record.sessions.length > 1 ? `${record.sessions.length} sessions` : null
    };
  };

  const isAdmin = currentUser?.role === 'Admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-odizo-grey to-slate-900 dark:from-white dark:via-odizo-grey dark:to-white bg-clip-text text-transparent">
            {isAdmin ? 'Attendance Reports' : 'Personal History'}
          </h1>
          <p className="text-sm text-odizo-grey mt-1">
            {isAdmin 
              ? 'Audit shift logs, verify geolocations, and export CSV timesheets' 
              : 'Browse, verify, and export your historical attendance logs'}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={records.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-odizo-red/30 text-slate-900 dark:text-white rounded-full text-sm font-semibold transition-all duration-300 shadow-md hover:shadow-red-900/10 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Download size={14} />
          <span>Export Timesheet</span>
        </button>
      </div>

      {/* Filters Box */}
      <div className={`glass-card p-6 floating-shadow border-black/5 dark:border-white/5 grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2' : ''} gap-6`}>
        {/* User filter (Admin only) */}
        {isAdmin && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5 flex items-center gap-1">
              <UserIcon size={12} className="text-odizo-red" />
              <span>Filter by Staff</span>
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none"
            >
              <option value="" className="bg-black text-slate-900 dark:text-white">All Staff Members</option>
              {users.map(u => (
                <option key={u._id} value={u._id} className="bg-black text-slate-900 dark:text-white">{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
        )}

        {/* Date filter */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5 flex items-center gap-1">
            <Calendar size={12} className="text-odizo-red" />
            <span>Filter by Date</span>
          </label>
          <div className="relative w-full">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white flex justify-between items-center pointer-events-none">
              <span className={selectedDate ? 'text-slate-900 dark:text-white font-medium' : 'text-odizo-grey'}>
                {selectedDate ? formatDisplayDate(selectedDate) : 'DD-MM-YYYY'}
              </span>
              <div className="flex items-center gap-2 pointer-events-auto">
                {selectedDate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setSelectedDate('');
                    }}
                    className="p-0.5 hover:bg-black/5 dark:bg-white/10 rounded text-odizo-grey hover:text-slate-900 dark:text-white dark:hover:text-white transition-colors cursor-pointer z-20"
                    title="Clear date"
                  >
                    <X size={14} />
                  </button>
                )}
                <Calendar size={14} className="text-odizo-grey" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card p-6 floating-shadow border-black/5 dark:border-white/5 overflow-hidden">
        <h2 className="text-xl font-bold mb-4">Audit Trail</h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
            <p className="mt-4 text-sm text-odizo-grey">Compiling records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
            <FileText size={40} className="mx-auto text-odizo-grey/50 mb-3" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">No matching records found</p>
            <p className="text-xs text-odizo-grey mt-1">Try adjusting your filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative rounded-xl border border-black/10 dark:border-white/5">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 z-10 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                <tr className="text-odizo-grey font-medium text-xs uppercase border-b border-black/10 dark:border-white/5">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Date & Mode</th>
                  <th className="py-3 px-4">Shift Timings</th>
                  <th className="py-3 px-4">Hours Logged</th>
                  <th className="py-3 px-4">Status & Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/5 bg-transparent">
                {records.map((record) => (
                  <tr 
                    key={record._id}
                    className={`transition-all duration-200 border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 ${
                      record.isFlagged ? 'border-l-2 border-l-odizo-red/60 bg-red-500/[0.02]' : ''
                    }`}
                  >
                    {/* Employee Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {/* Placeholder Initial Circle */}
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                          record.userId?.role === 'Admin' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
                          record.userId?.role === 'Employee' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                          'bg-gradient-to-br from-emerald-500 to-teal-600'
                        }`}>
                          {getInitials(record.userId?.name)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">{record.userId?.name || 'Unknown'}</span>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              record.userId?.role === 'Employee' 
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {record.userId?.role || 'Staff'}
                            </span>
                          </div>
                          <span className="text-[11px] text-odizo-grey truncate max-w-[160px]">{record.userId?.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Date & Mode Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-white font-mono text-[13px]">{formatDisplayDate(record.date)}</span>
                        <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded font-bold border w-fit uppercase mt-0.5 ${
                          record.isWFH 
                            ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {record.isWFH ? <Home size={10} /> : <MapPin size={10} />}
                          {record.isWFH ? 'WFH' : 'Office'}
                        </span>
                      </div>
                    </td>

                    {/* Shift Timings Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-white font-mono text-[13px]">{getTimingsSummary(record).main}</span>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <span className={`text-[10px] font-medium ${
                            record.isFlagged ? 'text-rose-500 dark:text-rose-400 font-bold' : 'text-odizo-grey'
                          }`}>
                            {record.shiftSnapshot?.name || 'Standard Shift'} ({record.shiftSnapshot?.startTime || '09:00'}-{record.shiftSnapshot?.endTime || '18:00'})
                          </span>
                          {getTimingsSummary(record).sub && (
                            <span className="text-[10px] text-odizo-grey font-medium">{getTimingsSummary(record).sub}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Hours Logged Column */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 dark:text-white font-mono text-[13px]">
                        {Math.floor(record.totalMinutesWorked / 60)}h {record.totalMinutesWorked % 60}m
                      </span>
                    </td>

                    {/* Status & Verification Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Attendance Status */}
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          record.attendanceStatus === 'Present' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                            : record.attendanceStatus === 'Late'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {record.attendanceStatus}
                        </span>

                        {/* Verification Status */}
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          record.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : record.status === 'Rejected'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {record.status === 'Pending Approval' ? 'Pending' : record.status}
                        </span>

                        {/* Flagged Status */}
                        {record.isFlagged && (
                          <span 
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-500/10 text-rose-400 border-rose-500/30 uppercase tracking-wider"
                            title={record.flagReason}
                          >
                            <ShieldAlert size={10} />
                            Flagged
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setIsDrawerOpen(true);
                          }}
                          className="p-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-slate-700 dark:text-odizo-grey dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {isAdmin && record.status === 'Pending Approval' && (
                          <>
                            <button
                              onClick={() => handleReview(record._id, 'Approved')}
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-lg transition-all cursor-pointer"
                              title="Approve"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => handleReview(record._id, 'Rejected')}
                              className="p-1.5 bg-odizo-red/10 hover:bg-odizo-red/20 border border-odizo-red/20 hover:border-odizo-red/40 text-odizo-red rounded-lg transition-all cursor-pointer"
                              title="Reject"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Slide-Over Side Drawer */}
      {isDrawerOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Blur Overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out"
            onClick={() => {
              setIsDrawerOpen(false);
              setSelectedRecord(null);
            }}
          />

          {/* Drawer Panel Container */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-slate-950/95 border-l border-white/10 shadow-2xl overflow-y-auto flex flex-col justify-between">
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Attendance Details</h3>
                    <p className="text-xs text-odizo-grey font-mono mt-0.5">{formatDisplayDate(selectedRecord.date)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setSelectedRecord(null);
                    }}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-odizo-grey hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Employee Profile Card */}
                <div className="bg-white/3 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${
                    selectedRecord.userId?.role === 'Admin' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
                    selectedRecord.userId?.role === 'Employee' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                    'bg-gradient-to-br from-emerald-500 to-teal-600'
                  }`}>
                    {getInitials(selectedRecord.userId?.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white truncate">{selectedRecord.userId?.name || 'Unknown User'}</h4>
                    <p className="text-xs text-odizo-grey truncate">{selectedRecord.userId?.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        selectedRecord.userId?.role === 'Employee' 
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {selectedRecord.userId?.role || 'Staff'}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-bold border uppercase ${
                        selectedRecord.isWFH 
                          ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' 
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {selectedRecord.isWFH ? <Home size={10} /> : <MapPin size={10} />}
                        {selectedRecord.isWFH ? 'WFH' : 'Office'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shift & Work Summary */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-odizo-grey">Shift & Performance</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/2 border border-white/5 rounded-xl p-3">
                      <span className="text-[10px] text-odizo-grey uppercase font-bold block">Shift Profile</span>
                      <p className="text-sm font-semibold text-white mt-1 truncate">{selectedRecord.shiftSnapshot?.name || 'Standard Shift'}</p>
                      <p className="text-[10px] text-odizo-grey font-mono mt-0.5">
                        {selectedRecord.shiftSnapshot?.startTime} - {selectedRecord.shiftSnapshot?.endTime}
                      </p>
                    </div>
                    <div className="bg-white/2 border border-white/5 rounded-xl p-3">
                      <span className="text-[10px] text-odizo-grey uppercase font-bold block">Total Time Worked</span>
                      <p className="text-sm font-semibold text-white font-mono mt-1">
                        {Math.floor(selectedRecord.totalMinutesWorked / 60)}h {selectedRecord.totalMinutesWorked % 60}m
                      </p>
                      <p className="text-[10px] text-odizo-grey mt-0.5">
                        {selectedRecord.sessions.length} Punch Sessions
                      </p>
                    </div>
                  </div>
                </div>

                {/* Flag Alert Section */}
                {selectedRecord.isFlagged && (
                  <div className="bg-rose-500/5 border border-rose-500/25 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold uppercase tracking-wider">
                      <ShieldAlert size={14} />
                      <span>Audit Flag Alert</span>
                    </div>
                    <p className="text-xs text-rose-300 leading-relaxed font-semibold">
                      Reason: {selectedRecord.flagReason || 'Unusual punch coordinates or network profile detected.'}
                    </p>
                  </div>
                )}

                {/* Punch Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-odizo-grey">Punch Session Breakdown</h4>
                  <div className="relative border-l border-white/10 pl-5 ml-2.5 space-y-5">
                    {selectedRecord.sessions.map((s, idx) => (
                      <div key={idx} className="relative">
                        {/* Dot */}
                        <div className="absolute -left-[27.5px] top-1.5 h-3.5 w-3.5 rounded-full bg-slate-950 border-2 border-odizo-red flex items-center justify-center" />
                        
                        <div className="bg-white/2 border border-white/5 rounded-xl p-3.5 space-y-3">
                          <span className="inline-flex px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-white uppercase">
                            Session {idx + 1}
                          </span>

                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-[10px] text-odizo-grey block uppercase font-bold">Punch In</span>
                              <span className="font-semibold font-mono text-white text-[13px] block mt-0.5">
                                {new Date(s.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${s.checkInLocation.latitude},${s.checkInLocation.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-odizo-red hover:underline flex items-center gap-0.5 mt-1.5 text-[10px] font-medium"
                                title={s.checkInLocation.address}
                              >
                                <MapPin size={10} />
                                <span>GPS Pin</span>
                                <ExternalLink size={8} />
                              </a>
                            </div>
                            <div>
                              <span className="text-[10px] text-odizo-grey block uppercase font-bold">Punch Out</span>
                              {s.checkOut ? (
                                <>
                                  <span className="font-semibold font-mono text-white text-[13px] block mt-0.5">
                                    {new Date(s.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {s.checkOutLocation && (
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${s.checkOutLocation.latitude},${s.checkOutLocation.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-odizo-red hover:underline flex items-center gap-0.5 mt-1.5 text-[10px] font-medium"
                                      title={s.checkOutLocation.address}
                                    >
                                      <MapPin size={10} />
                                      <span>GPS Pin</span>
                                      <ExternalLink size={8} />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <span className="text-amber-400 font-semibold italic text-[11px] block mt-1">Active Session</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Completed Tasks */}
                {selectedRecord.completedTasks && selectedRecord.completedTasks.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-odizo-grey flex items-center gap-1">
                      <ClipboardList size={12} className="text-odizo-red" />
                      <span>Completed Tasks</span>
                    </h4>
                    <div className="bg-white/2 border border-white/5 rounded-xl p-4">
                      <ul className="list-disc pl-4 space-y-1.5 text-xs text-white leading-relaxed">
                        {selectedRecord.completedTasks.map((task, idx) => (
                          <li key={idx}>{task}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Sticky Footer Actions */}
              {isAdmin && selectedRecord.status === 'Pending Approval' && (
                <div className="p-6 border-t border-white/5 bg-slate-950/80 backdrop-blur-md space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-odizo-grey">Admin Review Actions</h4>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReview(selectedRecord._id, 'Approved')}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReview(selectedRecord._id, 'Rejected')}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <X size={14} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
