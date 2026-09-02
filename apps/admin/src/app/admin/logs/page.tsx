'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Search, 
  RefreshCw, 
  Smartphone, 
  MapPin, 
  Clock, 
  LogIn, 
  LogOut, 
  Home, 
  Building2, 
  ExternalLink,
  ShieldAlert,
  LayoutGrid,
  List,
  CheckCircle,
  UserX,
  UserCheck
} from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Employee' | 'Intern';
  workMode?: 'On-Site' | 'Remote' | 'Hybrid';
  status: 'Active' | 'Inactive';
  shift?: {
    name: string;
    startTime: string;
    endTime: string;
  };
}

interface PunchSession {
  checkIn: string;
  checkOut?: string;
  checkInLocation: { latitude: number; longitude: number; address?: string };
  checkOutLocation?: { latitude: number; longitude: number; address?: string };
  checkInDevice?: string;
  checkOutDevice?: string;
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
  isWFH?: boolean;
}

interface LogEvent {
  id: string;
  type: 'IN' | 'OUT';
  user: User;
  recordId: string;
  date: string;
  time: Date;
  timeStr: string;
  location?: { latitude: number; longitude: number; address?: string };
  device?: string;
  isActive: boolean;
  durationMinutes?: number;
  shiftName: string;
  shiftTime: string;
  isWFH?: boolean;
  isFlagged?: boolean;
  attendanceStatus?: string;
}

export default function CompanyLogsPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'in' | 'out' | 'not_clocked'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const fetchLiveLogs = async () => {
    try {
      setRefreshing(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const [attRes, usersRes] = await Promise.all([
        fetch(`/api/attendance?date=${todayStr}`),
        fetch('/api/users')
      ]);

      if (attRes.ok) {
        const attData = await attRes.json();
        setRecords(attData.records || []);
      }
      if (usersRes.ok) {
        const userData = await usersRes.json();
        setUsers(userData.users || []);
      }
    } catch (e) {
      console.error('Error fetching live logs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveLogs();
    const interval = setInterval(fetchLiveLogs, 25000); // 25s auto live sync
    return () => clearInterval(interval);
  }, []);

  // Build sorted chronological list of punch events
  const events: LogEvent[] = records.flatMap((record) => {
    const list: LogEvent[] = [];
    record.sessions.forEach((s, idx) => {
      // 1. Check-In Event
      list.push({
        id: `${record._id}-in-${idx}`,
        type: 'IN',
        user: record.userId,
        recordId: record._id,
        date: record.date,
        time: new Date(s.checkIn),
        timeStr: new Date(s.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        location: s.checkInLocation,
        device: s.checkInDevice || 'Mobile App',
        isActive: !s.checkOut,
        shiftName: record.shiftSnapshot?.name || 'Standard Shift',
        shiftTime: `${record.shiftSnapshot?.startTime || '09:00'} - ${record.shiftSnapshot?.endTime || '18:00'}`,
        isWFH: record.isWFH,
        isFlagged: record.isFlagged,
        attendanceStatus: record.attendanceStatus
      });

      // 2. Check-Out Event (if punch-out was recorded)
      if (s.checkOut) {
        const checkInTime = new Date(s.checkIn).getTime();
        const checkOutTime = new Date(s.checkOut).getTime();
        list.push({
          id: `${record._id}-out-${idx}`,
          type: 'OUT',
          user: record.userId,
          recordId: record._id,
          date: record.date,
          time: new Date(s.checkOut),
          timeStr: new Date(s.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
          location: s.checkOutLocation,
          device: s.checkOutDevice || 'Mobile App',
          isActive: false,
          durationMinutes: Math.round((checkOutTime - checkInTime) / 60000),
          shiftName: record.shiftSnapshot?.name || 'Standard Shift',
          shiftTime: `${record.shiftSnapshot?.startTime || '09:00'} - ${record.shiftSnapshot?.endTime || '18:00'}`,
          isWFH: record.isWFH,
          isFlagged: record.isFlagged,
          attendanceStatus: record.attendanceStatus
        });
      }
    });
    return list;
  }).sort((a, b) => b.time.getTime() - a.time.getTime());

  // Helper metrics
  const activeRecords = records.filter(r => r.sessions.some(s => !s.checkOut));
  const activeCount = activeRecords.length;
  const punchInCount = events.filter(e => e.type === 'IN').length;
  const punchOutCount = events.filter(e => e.type === 'OUT').length;
  const clockedInUserIds = new Set(records.filter(r => r.sessions.length > 0).map(r => r.userId?._id?.toString()));
  const notClockedStaff = users.filter(u => !clockedInUserIds.has(u._id?.toString()));

  // Filtered Events
  const filteredEvents = events.filter(e => {
    const matchesSearch = 
      e.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.device?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location?.address?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'active') return e.type === 'IN' && e.isActive;
    if (filterType === 'in') return e.type === 'IN';
    if (filterType === 'out') return e.type === 'OUT';
    return true;
  });

  const filteredNotClocked = notClockedStaff.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderWorkModeBadge = (user?: User, isWFH?: boolean) => {
    const mode = user?.workMode;
    if (mode === 'Remote') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold border bg-purple-500/10 border-purple-500/25 text-purple-400">
          <Home size={11} />
          REMOTE
        </span>
      );
    }
    if (mode === 'Hybrid') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold border bg-amber-500/10 border-amber-500/25 text-amber-400">
          <Building2 size={11} />
          HYBRID {isWFH ? '(WFH)' : '(Office)'}
        </span>
      );
    }
    if (isWFH) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold border bg-sky-500/10 border-sky-500/25 text-sky-400">
          <Home size={11} />
          WFH APPROVED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold border bg-emerald-500/10 border-emerald-500/25 text-emerald-400">
        <Building2 size={11} />
        ON-SITE
      </span>
    );
  };

  const todayDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Header */}
      <div className="glass-card p-6 rounded-2xl border-black/5 dark:border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-odizo-red/10 border border-odizo-red/20 text-odizo-red shadow-[0_0_20px_rgba(225,97,103,0.15)]">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Live Punch Activity & Company Logs
                </h1>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-odizo-grey mt-0.5">
                Real-time biometric, GPS & Wi-Fi verified activity across <strong className="text-slate-800 dark:text-slate-200">ODIZO</strong> workspaces for <span className="text-slate-900 dark:text-white font-semibold">{todayDisplay}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-odizo-grey" />
            <input
              type="text"
              placeholder="Search staff, email, device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-odizo-grey focus:outline-none focus:border-odizo-red transition-all"
            />
          </div>

          <button 
            onClick={fetchLiveLogs}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-odizo-red/10 border border-odizo-red/25 hover:bg-odizo-red/20 text-xs font-bold text-odizo-red transition-all duration-300 cursor-pointer disabled:opacity-50"
            title="Refresh logs from server"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Live Sync'}</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Metric Tiles (Interactive Quick Filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tile 1: Currently On-Shift */}
        <button
          type="button"
          onClick={() => setFilterType('active')}
          className={`text-left p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
            filterType === 'active'
              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
              : 'glass-card border-black/5 dark:border-white/5 hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-odizo-grey">Currently Working</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-2">{activeCount}</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-[11px]">
            <span className="text-emerald-500 font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              On-Shift Right Now
            </span>
            <span className="text-odizo-grey underline font-semibold">Filter ➔</span>
          </div>
        </button>

        {/* Tile 2: Punch-Ins Today */}
        <button
          type="button"
          onClick={() => setFilterType('in')}
          className={`text-left p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
            filterType === 'in'
              ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30'
              : 'glass-card border-black/5 dark:border-white/5 hover:border-blue-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-odizo-grey">Punched In Today</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <LogIn size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-400 mt-2">{punchInCount}</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-[11px]">
            <span className="text-odizo-grey font-medium">Arrival Events</span>
            <span className="text-blue-400 underline font-semibold">Filter ➔</span>
          </div>
        </button>

        {/* Tile 3: Punch-Outs Today */}
        <button
          type="button"
          onClick={() => setFilterType('out')}
          className={`text-left p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
            filterType === 'out'
              ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/30'
              : 'glass-card border-black/5 dark:border-white/5 hover:border-purple-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-odizo-grey">Punched Out Today</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <LogOut size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-400 mt-2">{punchOutCount}</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-[11px]">
            <span className="text-odizo-grey font-medium">Departure Records</span>
            <span className="text-purple-400 underline font-semibold">Filter ➔</span>
          </div>
        </button>

        {/* Tile 4: Not Clocked In Yet */}
        <button
          type="button"
          onClick={() => setFilterType('not_clocked')}
          className={`text-left p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
            filterType === 'not_clocked'
              ? 'bg-rose-500/10 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30'
              : 'glass-card border-black/5 dark:border-white/5 hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-odizo-grey">Not Clocked In</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <UserX size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-400 mt-2">{notClockedStaff.length}</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-[11px]">
            <span className="text-odizo-grey font-medium">Awaiting Arrival</span>
            <span className="text-rose-400 underline font-semibold">Filter ➔</span>
          </div>
        </button>
      </div>

      {/* 3. Main Stream Section */}
      <div className="glass-card rounded-2xl border-black/5 dark:border-white/5 p-6 shadow-xl space-y-6">
        {/* Navigation & Segmented Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-black/5 dark:border-white/5">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-odizo-red/15 text-odizo-red border border-odizo-red/30 shadow-[0_0_12px_rgba(225,97,103,0.15)]'
                  : 'bg-black/5 dark:bg-white/5 text-odizo-grey hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <Activity size={14} />
              <span>All Activity</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-[10px]">
                {events.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('active')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'active'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'bg-black/5 dark:bg-white/5 text-odizo-grey hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active On-Shift</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('in')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'in'
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                  : 'bg-black/5 dark:bg-white/5 text-odizo-grey hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <LogIn size={14} />
              <span>Check-Ins</span>
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">
                {punchInCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('out')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'out'
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                  : 'bg-black/5 dark:bg-white/5 text-odizo-grey hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <LogOut size={14} />
              <span>Check-Outs</span>
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px]">
                {punchOutCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('not_clocked')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'not_clocked'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                  : 'bg-black/5 dark:bg-white/5 text-odizo-grey hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <UserX size={14} />
              <span>Not Clocked In</span>
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px]">
                {notClockedStaff.length}
              </span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/10 dark:border-white/10 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-odizo-grey hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Feed Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-odizo-grey hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List size={13} />
              <span>Structured Table</span>
            </button>
          </div>
        </div>

        {/* Content Render */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-odizo-grey">Syncing Live Logs...</p>
          </div>
        ) : filterType === 'not_clocked' ? (
          /* NOT CLOCKED IN LIST */
          filteredNotClocked.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-emerald-500/25 bg-emerald-500/5 rounded-2xl">
              <CheckCircle size={44} className="mx-auto text-emerald-400 mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">100% Attendance Today!</h3>
              <p className="text-xs text-odizo-grey mt-1">Every registered employee has punched in for work today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 text-odizo-grey font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Work Mode</th>
                    <th className="py-3.5 px-4">Expected Shift</th>
                    <th className="py-3.5 px-4">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {filteredNotClocked.map((staff) => (
                    <tr key={staff._id} className="hover:bg-black/5 dark:hover:bg-white/3 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center font-bold text-xs">
                            {staff.name ? staff.name.substring(0, 2).toUpperCase() : 'OD'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{staff.name}</div>
                            <div className="text-odizo-grey font-normal text-[11px]">{staff.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                          staff.role === 'Employee' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {staff.role}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {renderWorkModeBadge(staff)}
                      </td>
                      <td className="py-4 px-4 text-odizo-grey">
                        <span className="font-semibold text-slate-900 dark:text-white block">{staff.shift?.name || 'Standard Shift'}</span>
                        <span className="text-[11px]">{staff.shift?.startTime} - {staff.shift?.endTime}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Awaiting Check-In
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredEvents.length === 0 ? (
          /* EMPTY STATE */
          <div className="text-center py-20 border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
            <ShieldCheck size={44} className="mx-auto text-odizo-grey/40 mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Punch Events Found</h3>
            <p className="text-xs text-odizo-grey mt-1">There are no records matching your current filter criteria.</p>
          </div>
        ) : viewMode === 'cards' ? (
          /* CARD / FEED VIEW */
          <div className="space-y-3.5">
            {filteredEvents.map((evt) => {
              const isPunchIn = evt.type === 'IN';
              const durationHours = evt.durationMinutes !== undefined ? Math.floor(evt.durationMinutes / 60) : 0;
              const durationMins = evt.durationMinutes !== undefined ? evt.durationMinutes % 60 : 0;

              return (
                <div 
                  key={evt.id} 
                  className={`p-5 rounded-2xl border transition-all duration-300 ${
                    evt.isActive
                      ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                      : 'bg-black/5 dark:bg-white/2 border-black/5 dark:border-white/5 hover:border-black/15 dark:hover:border-white/15'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: User Avatar & Basic Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="relative mt-0.5">
                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-sm border ${
                          isPunchIn
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                        }`}>
                          {evt.user?.name ? evt.user.name.substring(0, 2).toUpperCase() : 'OD'}
                        </div>
                        {evt.isActive && (
                          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-black animate-pulse" />
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-extrabold text-slate-900 dark:text-white">
                            {evt.user?.name || 'Unknown Staff'}
                          </span>
                          <span className="text-xs text-odizo-grey font-normal">
                            ({evt.user?.email})
                          </span>
                          {renderWorkModeBadge(evt.user, evt.isWFH)}
                          
                          {evt.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE ON-SHIFT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-black/5 dark:bg-white/5 text-odizo-grey">
                              Completed Session
                            </span>
                          )}

                          {evt.isFlagged && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <ShieldAlert size={11} />
                              FLAGGED
                            </span>
                          )}
                        </div>

                        {/* Event Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-odizo-grey">
                          {/* Col 1: Action */}
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">Action:</span>
                            <span className={`inline-flex items-center gap-1 font-bold ${
                              isPunchIn ? 'text-blue-400' : 'text-purple-400'
                            }`}>
                              {isPunchIn ? <LogIn size={13} /> : <LogOut size={13} />}
                              {isPunchIn ? 'Shift Check-In' : 'Shift Check-Out'}
                            </span>
                          </div>

                          {/* Col 2: Shift */}
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">Shift:</span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">
                              {evt.shiftName} ({evt.shiftTime})
                            </span>
                          </div>

                          {/* Col 3: Duration */}
                          {evt.durationMinutes !== undefined ? (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">Worked:</span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {durationHours > 0 ? `${durationHours}h ` : ''}{durationMins}m
                              </span>
                            </div>
                          ) : evt.isActive ? (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">Session:</span>
                              <span className="text-emerald-400 font-semibold font-mono">
                                In Progress...
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Right: Timestamp, Location & Device */}
                    <div className="flex lg:flex-col items-end justify-between lg:justify-center border-t lg:border-t-0 border-black/5 dark:border-white/5 pt-3 lg:pt-0 gap-2 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-odizo-red">
                          <Clock size={14} />
                        </div>
                        <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                          {evt.timeStr}
                        </span>
                      </div>

                      {/* Location Pin */}
                      {evt.location ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${evt.location.latitude},${evt.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-odizo-red hover:underline flex items-center gap-1 font-semibold"
                          title="Open GPS Location in Google Maps"
                        >
                          <MapPin size={12} />
                          <span className="truncate max-w-[170px]">
                            {evt.location.address || `${evt.location.latitude.toFixed(3)}, ${evt.location.longitude.toFixed(3)}`}
                          </span>
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-[11px] text-odizo-grey">GPS Location N/A</span>
                      )}

                      {/* Device Chip */}
                      <span className="text-[10px] text-odizo-grey flex items-center gap-1">
                        <Smartphone size={11} />
                        {evt.device}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* STRUCTURED TABLE VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5 text-odizo-grey font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Event Type</th>
                  <th className="py-3.5 px-4">Work Mode</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Shift Details</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredEvents.map((evt) => {
                  const isPunchIn = evt.type === 'IN';
                  const durationHours = evt.durationMinutes !== undefined ? Math.floor(evt.durationMinutes / 60) : 0;
                  const durationMins = evt.durationMinutes !== undefined ? evt.durationMinutes % 60 : 0;

                  return (
                    <tr key={evt.id} className="hover:bg-black/5 dark:hover:bg-white/3 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-[10px] border ${
                            isPunchIn
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                            {evt.user?.name ? evt.user.name.substring(0, 2).toUpperCase() : 'OD'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{evt.user?.name || 'Unknown'}</div>
                            <div className="text-odizo-grey font-normal text-[10px]">{evt.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          isPunchIn 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {isPunchIn ? <LogIn size={11} /> : <LogOut size={11} />}
                          {isPunchIn ? 'Check-In' : 'Check-Out'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {renderWorkModeBadge(evt.user, evt.isWFH)}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {evt.timeStr}
                      </td>
                      <td className="py-4 px-4 text-odizo-grey">
                        <span className="font-semibold text-slate-900 dark:text-white block">{evt.shiftName}</span>
                        <span className="text-[10px]">{evt.shiftTime}</span>
                      </td>
                      <td className="py-4 px-4 font-mono font-medium text-slate-900 dark:text-white">
                        {evt.durationMinutes !== undefined 
                          ? `${durationHours > 0 ? `${durationHours}h ` : ''}${durationMins}m` 
                          : evt.isActive 
                            ? <span className="text-emerald-400 font-bold">Active...</span> 
                            : '-'}
                      </td>
                      <td className="py-4 px-4 text-odizo-grey">
                        {evt.location ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${evt.location.latitude},${evt.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-odizo-red hover:underline flex items-center gap-1 font-semibold"
                          >
                            <MapPin size={11} />
                            <span className="truncate max-w-[130px]">{evt.location.address || `${evt.location.latitude.toFixed(2)}, ${evt.location.longitude.toFixed(2)}`}</span>
                          </a>
                        ) : (
                          <span>N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-odizo-grey text-[11px] truncate max-w-[100px]">
                        {evt.device}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
