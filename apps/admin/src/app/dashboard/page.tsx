'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  User as UserIcon, 
  LogOut, 
  Clock, 
  Calendar, 
  Home, 
  RefreshCw, 
  Megaphone, 
  FileText,
  CheckCircle,
  AlertCircle,
  LogIn,
  MapPin,
  Smartphone,
  ShieldCheck,
  Building2,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { EmployeeQuickStats } from '@/components/ui/EmployeeQuickStats';
import { showConfirm, showError, showSuccess } from '@/lib/swal';

interface PunchSession {
  checkIn: string;
  checkOut?: string;
  checkInLocation: { latitude: number; longitude: number; address?: string };
  checkOutLocation?: { latitude: number; longitude: number; address?: string };
  checkInDevice?: string;
  checkOutDevice?: string;
}

interface DailyAttendance {
  _id?: string;
  date: string;
  attendanceStatus: string;
  totalMinutesWorked: number;
  sessions: PunchSession[];
  isWFH?: boolean;
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState<{ id: string; name: string; role: string; email: string; workMode?: string; shift?: any } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Attendance states
  const [todayRecord, setTodayRecord] = useState<DailyAttendance | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [punching, setPunching] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Employee stats
  const [leaveCount, setLeaveCount] = useState(0);
  const [wfhCount, setWfhCount] = useState(0);
  const [swapCount, setSwapCount] = useState(0);

  // Load user & sync live profile
  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Fetch live user profile directly from server to get accurate workMode
    fetch('/api/users/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      })
      .catch(err => console.warn('Could not sync live user profile:', err));

    // Try to get geolocation
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        (err) => {
          console.warn('Geolocation warning:', err.message);
          // Default office coords fallback
          setUserCoords({ latitude: 25.5941, longitude: 85.1376 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's attendance record
  const fetchTodayAttendance = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingRecord(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/attendance?startDate=${todayStr}&endDate=${todayStr}&userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.records && data.records.length > 0) {
          const myRec = data.records.find((r: any) => {
            const uId = r.userId?._id || r.userId?.id || r.userId;
            return uId === user.id;
          });
          setTodayRecord(myRec || null);
        } else {
          setTodayRecord(null);
        }
      }
    } catch (err) {
      console.error('Error fetching employee attendance:', err);
    } finally {
      setLoadingRecord(false);
    }
  }, [user]);

  // Fetch employee stats
  const fetchEmployeeStats = useCallback(async () => {
    if (!user) return;
    try {
      const [resLeaves, resSwaps] = await Promise.all([
        fetch(`/api/leaves/my?userId=${user.id}`),
        fetch('/api/swaps')
      ]);

      if (resLeaves.ok) {
        const data = await resLeaves.json();
        if (data.leaves) {
          const approvedL = data.leaves.filter((l: any) => l.status === 'Approved' && (!l.requestType || l.requestType === 'Leave')).length;
          const approvedW = data.leaves.filter((l: any) => l.status === 'Approved' && l.requestType === 'WFH').length;
          setLeaveCount(approvedL);
          setWfhCount(approvedW);
        }
      }

      if (resSwaps.ok) {
        const data = await resSwaps.json();
        if (data.swaps) {
          const mySwaps = data.swaps.filter((s: any) => {
            const reqId = s.requesterId?._id || s.requesterId?.id || s.requesterId;
            const tarId = s.targetUserId?._id || s.targetUserId?.id || s.targetUserId;
            return (reqId === user.id || tarId === user.id) && s.status === 'Approved';
          }).length;
          setSwapCount(mySwaps);
        }
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
      fetchEmployeeStats();
    }
  }, [user, fetchTodayAttendance, fetchEmployeeStats]);

  if (!mounted) return null;

  // Active session check
  const activeSession = todayRecord?.sessions?.find((s) => !s.checkOut);
  const isCheckedIn = !!activeSession;

  // Calculate live elapsed time
  let activeElapsedStr = '';
  if (activeSession) {
    const elapsedMs = Math.max(0, currentTime.getTime() - new Date(activeSession.checkIn).getTime());
    const totalSecs = Math.floor(elapsedMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    activeElapsedStr = `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }

  // Handle Punch In / Out
  const handlePunchAction = async () => {
    if (!user) return;

    const actionType = isCheckedIn ? 'Check-Out' : 'Check-In';
    const confirmTitle = isCheckedIn ? 'Confirm Punch Out' : 'Confirm Punch In';
    const confirmText = isCheckedIn 
      ? 'Are you sure you want to punch out and end your active working session?' 
      : `Ready to start working? Your punch will be timestamped at ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`;

    const confirmed = await showConfirm(confirmTitle, confirmText);
    if (!confirmed) return;

    try {
      setPunching(true);
      const coords = userCoords || { latitude: 25.5941, longitude: 85.1376 };

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: actionType,
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            address: 'Web Attendance'
          },
          deviceInfo: 'ODIZO Web Portal'
        })
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess(
          isCheckedIn ? 'Punched Out!' : 'Punched In Successfully!',
          isCheckedIn 
            ? 'Your shift has ended and working duration is logged.' 
            : 'Your shift has started. Have a productive day!'
        );
        fetchTodayAttendance();
      } else {
        showError('Punch Failed', data.error || 'Could not record punch.');
      }
    } catch (err: any) {
      console.error(err);
      showError('Connection Error', 'Failed to communicate with attendance server.');
    } finally {
      setPunching(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    document.cookie = 'token=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const userRole = user?.role ? user.role.toUpperCase() : 'EMPLOYEE';
  const isRemoteWorker = String(user?.workMode || '').trim().toLowerCase() === 'remote';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors duration-300 flex flex-col">
      {/* Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 glass-card m-4 border-black/5 dark:border-white/5">
        <Logo size="md" />

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold">{user ? user.name : 'Loading...'}</span>
              <span className="text-xs text-odizo-grey uppercase tracking-wider">{userRole} Portal</span>
            </div>
            <div className="h-10 w-10 rounded-full border border-odizo-red/20 bg-odizo-red/5 flex items-center justify-center text-odizo-red shadow-[0_0_10px_rgba(225,97,103,0.15)] font-bold text-xs">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'OD'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-odizo-grey hover:text-odizo-red hover:bg-odizo-red/10 border border-black/5 dark:border-white/5 hover:border-odizo-red/20 transition-all duration-300 text-xs font-semibold cursor-pointer"
            title="Logout"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* 1. Live Punch-In / Punch-Out Terminal */}
        <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-zinc-900 via-[#111116] to-zinc-900 border border-white/10 shadow-2xl text-white">
          <div className="absolute -right-10 -top-10 w-96 h-96 bg-odizo-red/10 rounded-full blur-3xl -z-10 pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-odizo-red/15 text-odizo-red border border-odizo-red/30 uppercase tracking-widest">
                  ODIZO Web Punch Terminal
                </span>
                
                {isCheckedIn ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    🟢 On-Shift Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/10">
                    ⚪ Off-Duty
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome, {user?.name || 'Employee'}! 👋
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-odizo-red" />
                  <span>Shift: <strong>{user?.shift?.startTime || '09:00'} - {user?.shift?.endTime || '18:00'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-purple-400" />
                  <span>Mode: <strong>{user?.workMode || 'On-Site'}</strong></span>
                </div>
              </div>
            </div>

            {/* Live Clock & Action Button Terminal */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md text-center sm:text-right space-y-1">
                <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Live System Time</div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-wider">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                {isCheckedIn && (
                  <div className="text-xs font-bold text-emerald-400">
                    ⏱️ {activeElapsedStr}
                  </div>
                )}
              </div>

              <button
                onClick={handlePunchAction}
                disabled={punching || loadingRecord}
                className={`flex items-center justify-center gap-3 px-8 py-5 rounded-2xl font-black text-base transition-all duration-300 shadow-2xl cursor-pointer disabled:opacity-50 ${
                  isCheckedIn
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-600/30'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-emerald-500/30'
                }`}
              >
                {punching ? (
                  <RefreshCw size={22} className="animate-spin" />
                ) : isCheckedIn ? (
                  <LogOut size={22} />
                ) : (
                  <LogIn size={22} />
                )}
                <span>
                  {punching 
                    ? 'Processing...' 
                    : isCheckedIn 
                      ? 'PUNCH OUT (END SHIFT)' 
                      : 'PUNCH IN (START SHIFT)'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Real Approved Balances Component */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-odizo-grey">My Approved Balances</h2>
            <span className="text-[11px] text-odizo-grey">Real-time Ground Truth</span>
          </div>
          <EmployeeQuickStats 
            leaveCount={leaveCount} 
            wfhCount={wfhCount} 
            swapCount={swapCount} 
            showWfh={!isRemoteWorker}
          />
        </div>

        {/* 3. Today's Sessions Log */}
        <div className="glass-card rounded-2xl p-6 border-black/5 dark:border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <Clock size={16} className="text-odizo-red" />
              <span>Today's Punch Log ({new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })})</span>
            </div>
            <button
              onClick={fetchTodayAttendance}
              className="p-1.5 rounded-lg text-odizo-grey hover:text-odizo-red hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-xs flex items-center gap-1"
            >
              <RefreshCw size={13} className={loadingRecord ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {!todayRecord || !todayRecord.sessions || todayRecord.sessions.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-black/10 dark:border-white/10 rounded-2xl text-odizo-grey text-xs">
              No punch sessions recorded yet today. Click "PUNCH IN" above to begin your work shift.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 text-odizo-grey font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Session</th>
                    <th className="py-2.5 px-3">Check-In</th>
                    <th className="py-2.5 px-3">Check-Out</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Device & Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5 font-medium">
                  {todayRecord.sessions.map((session, idx) => {
                    const checkInDate = new Date(session.checkIn);
                    const checkOutDate = session.checkOut ? new Date(session.checkOut) : null;
                    const durationMins = checkOutDate 
                      ? Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 60000) 
                      : null;

                    return (
                      <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/3 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-3 font-semibold text-blue-500">
                          {checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3 px-3 font-semibold text-purple-500">
                          {checkOutDate ? (
                            checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                              Active Now
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {durationMins !== null ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : 'In Progress...'}
                        </td>
                        <td className="py-3 px-3 text-odizo-grey">
                          <div className="flex items-center gap-2">
                            <Smartphone size={13} />
                            <span>{session.checkInDevice || 'Web Portal'}</span>
                            {session.checkInLocation && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${session.checkInLocation.latitude},${session.checkInLocation.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-blue-400 hover:underline"
                              >
                                <MapPin size={11} />
                                <span>GPS</span>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. Quick Portal Navigation Cards */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isRemoteWorker ? 'lg:grid-cols-4' : 'lg:grid-cols-4'} gap-4`}>
          <Link
            href="/admin/reports"
            className="p-5 rounded-2xl glass-card border-black/5 dark:border-white/5 flex flex-col justify-between hover:border-odizo-red/40 hover:shadow-lg transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                <FileText size={20} />
              </div>
              <ArrowRight size={14} className="text-odizo-grey group-hover:text-odizo-red group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">My Attendance History</h3>
              <p className="text-xs text-odizo-grey mt-1">View monthly attendance and logs</p>
            </div>
          </Link>

          <Link
            href="/admin/leaves"
            className="p-5 rounded-2xl glass-card border-black/5 dark:border-white/5 flex flex-col justify-between hover:border-odizo-red/40 hover:shadow-lg transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
                <Calendar size={20} />
              </div>
              <ArrowRight size={14} className="text-odizo-grey group-hover:text-odizo-red group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Leave Requests</h3>
              <p className="text-xs text-odizo-grey mt-1">Submit and track leave applications</p>
            </div>
          </Link>

          {/* Only show WFH card if employee is NOT remote */}
          {!isRemoteWorker && (
            <Link
              href="/admin/wfh"
              className="p-5 rounded-2xl glass-card border-black/5 dark:border-white/5 flex flex-col justify-between hover:border-odizo-red/40 hover:shadow-lg transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                  <Home size={20} />
                </div>
                <ArrowRight size={14} className="text-odizo-grey group-hover:text-odizo-red group-hover:translate-x-1 transition-all" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Work From Home</h3>
                <p className="text-xs text-odizo-grey mt-1">Apply for remote WFH approval</p>
              </div>
            </Link>
          )}

          <Link
            href="/admin/swaps"
            className="p-5 rounded-2xl glass-card border-black/5 dark:border-white/5 flex flex-col justify-between hover:border-odizo-red/40 hover:shadow-lg transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform">
                <RefreshCw size={20} />
              </div>
              <ArrowRight size={14} className="text-odizo-grey group-hover:text-odizo-red group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Shift Swaps</h3>
              <p className="text-xs text-odizo-grey mt-1">Exchange shift timings with peers</p>
            </div>
          </Link>

          {/* Show Notice Board when remote */}
          {isRemoteWorker && (
            <Link
              href="/admin/notices"
              className="p-5 rounded-2xl glass-card border-black/5 dark:border-white/5 flex flex-col justify-between hover:border-odizo-red/40 hover:shadow-lg transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <Megaphone size={20} />
                </div>
                <ArrowRight size={14} className="text-odizo-grey group-hover:text-odizo-red group-hover:translate-x-1 transition-all" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Notice Board</h3>
                <p className="text-xs text-odizo-grey mt-1">View official ODIZO announcements</p>
              </div>
            </Link>
          )}
        </div>

      </main>
    </div>
  );
}
