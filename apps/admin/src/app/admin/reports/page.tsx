'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Calendar, User as UserIcon, Search, MapPin, Download, Check, X, ShieldAlert, Home } from 'lucide-react';
import { showError, showSuccess } from '@/lib/swal';

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
}

export default function Reports() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const isAdmin = currentUser?.role === 'Admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-odizo-grey to-white bg-clip-text text-transparent">
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
          className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:border-odizo-red/30 text-white rounded-full text-sm font-semibold transition-all duration-300 shadow-md hover:shadow-red-900/10 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Download size={14} />
          <span>Export Timesheet</span>
        </button>
      </div>

      {/* Filters Box */}
      <div className={`glass-card p-6 floating-shadow border-white/5 grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2' : ''} gap-6`}>
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-odizo-red focus:outline-none animate-float-in"
            >
              <option value="" className="bg-black text-white">All Staff Members</option>
              {users.map(u => (
                <option key={u._id} value={u._id} className="bg-black text-white">{u.name} ({u.role})</option>
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
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-odizo-red focus:outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card p-6 floating-shadow border-white/5">
        <h2 className="text-xl font-bold mb-4">Audit Trail</h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
            <p className="mt-4 text-sm text-odizo-grey">Compiling records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
            <FileText size={40} className="mx-auto text-odizo-grey/50 mb-3" />
            <p className="text-sm font-semibold text-white">No matching records found</p>
            <p className="text-xs text-odizo-grey mt-1">Try adjusting your filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/5 text-odizo-grey font-medium text-xs uppercase">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Staff</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Punch In / Out Times</th>
                  <th className="py-3 px-4">Hours Logged</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Verification</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {records.map((record) => (
                  <tr 
                    key={record._id} 
                    className={`transition-colors ${
                      record.isFlagged 
                        ? 'bg-red-500/5 hover:bg-red-500/10 border-l-2 border-l-odizo-red/60 animate-pulse-slow' 
                        : 'hover:bg-white/3'
                    }`}
                  >
                    <td className="py-4 px-4 font-mono font-semibold text-white">
                      <div className="flex flex-col gap-1">
                        <span>{record.date}</span>
                        {record.isWFH && (
                          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-bold border bg-sky-500/10 border-sky-500/25 text-sky-400 w-fit uppercase">
                            <Home size={10} /> WFH
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-white">
                      <div className="flex flex-col">
                        <span>{record.userId?.name || 'Unknown User'}</span>
                        <span className="text-xs text-odizo-grey font-normal">{record.userId?.email}</span>
                        {record.isFlagged && (
                          <span className="text-[10px] text-odizo-red mt-1 flex items-center gap-1 font-semibold">
                            <ShieldAlert size={12} />
                            Flagged: {record.flagReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        record.userId?.role === 'Employee' 
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {record.userId?.role || 'User'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-white">
                      <div className="space-y-1.5">
                        {record.sessions.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px]">
                              Session {idx + 1}
                            </span>
                            <span>
                              {new Date(s.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {s.checkOut ? ` - ${new Date(s.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (Active)'}
                            </span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${s.checkInLocation.latitude},${s.checkInLocation.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-odizo-red hover:underline flex items-center gap-0.5"
                              title={s.checkInLocation.address || 'Show Map'}
                            >
                              <MapPin size={10} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono font-medium text-white">
                      {Math.floor(record.totalMinutesWorked / 60)}h {record.totalMinutesWorked % 60}m
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                        record.attendanceStatus === 'Present' 
                          ? 'bg-green-500/15 text-green-400' 
                          : record.attendanceStatus === 'Late'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-red-500/15 text-red-400'
                      }`}>
                        {record.attendanceStatus}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        record.status === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : record.status === 'Rejected'
                            ? 'bg-odizo-red/10 text-odizo-red border border-odizo-red/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-4 px-4 text-right">
                        {record.status === 'Pending Approval' ? (
                          <div className="flex justify-end gap-2">
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
                          </div>
                        ) : (
                          <span className="text-xs text-odizo-grey">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
