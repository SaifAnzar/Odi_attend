'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserCheck, 
  MapPin, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Search,
  Monitor,
  Play,
  Square,
  User as UserIcon,
  AlertCircle
} from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Employee' | 'Intern';
  status: 'Active' | 'Inactive';
  shift: {
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
}

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Personal punch UI states
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchNotes, setPunchNotes] = useState('');
  const [geoError, setGeoError] = useState('');
  const [geoCoordinates, setGeoCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [liveTimer, setLiveTimer] = useState('00:00:00');

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    try {
      setLoading(true);
      const storedUser = localStorage.getItem('user');
      let role = 'Admin';
      
      if (storedUser) {
        const u = JSON.parse(storedUser) as User;
        setCurrentUser(u);
        role = u.role;
      }

      if (role === 'Admin') {
        // Fetch all users for Admin
        const usersRes = await fetch('/api/users');
        const usersData = await usersRes.json();
        if (usersData.users) {
          setUsers(usersData.users.filter((u: User) => u.role !== 'Admin'));
        }

        // Fetch today's global attendance
        const attendanceRes = await fetch(`/api/attendance?date=${todayStr}`);
        const attendanceData = await attendanceRes.json();
        if (attendanceData.records) {
          setRecords(attendanceData.records);
        }
      } else {
        // Employee/Intern view: Fetch personal records only
        const attendanceRes = await fetch('/api/attendance');
        const attendanceData = await attendanceRes.json();
        if (attendanceData.records) {
          setRecords(attendanceData.records);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Attempt to pre-fetch browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('Geolocation denied or unavailable:', err.message);
          setGeoError('GPS location permission denied. Please allow location access to punch in/out.');
        }
      );
    } else {
      setGeoError('Geolocation is not supported by your browser.');
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Today's attendance record for the logged-in employee
  const todayRecord = records.find(r => r.date === todayStr);
  const activeSession = todayRecord?.sessions.find(s => !s.checkOut);
  const isCheckedIn = !!activeSession;

  // Running timer calculation for active check-in
  useEffect(() => {
    if (isCheckedIn && activeSession) {
      const startTime = new Date(activeSession.checkIn).getTime();
      
      const updateTimer = () => {
        const diffMs = Date.now() - startTime;
        const diffSecs = Math.floor(diffMs / 1000);
        const hours = Math.floor(diffSecs / 3600);
        const minutes = Math.floor((diffSecs % 3600) / 60);
        const seconds = diffSecs % 60;
        
        setLiveTimer(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };

      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      setLiveTimer('00:00:00');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isCheckedIn, activeSession]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Perform Punch Action
  const handlePunch = async () => {
    if (!navigator.geolocation) {
      alert('Browser geolocation is not supported.');
      return;
    }

    setPunchLoading(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setGeoCoordinates({ lat: latitude, lng: longitude });

        try {
          const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: isCheckedIn ? 'Check-Out' : 'Check-In',
              location: { 
                latitude, 
                longitude, 
                address: `Web Check-${isCheckedIn ? 'Out' : 'In'} Location`
              },
              deviceInfo: navigator.userAgent.substring(0, 80),
              notes: punchNotes || undefined
            })
          });

          const data = await res.json();
          if (res.ok) {
            setPunchNotes('');
            fetchData();
          } else {
            alert(data.error || 'Punch operation failed.');
          }
        } catch (e) {
          console.error(e);
          alert('Network connection error.');
        } finally {
          setPunchLoading(false);
        }
      },
      (error) => {
        console.error(error);
        setGeoError('GPS Location lock required to punch in or out.');
        setPunchLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // ----------------- ADMIN VIEW LOGIC -----------------
  const totalStaff = users.length;
  const totalEmployees = users.filter(u => u.role === 'Employee').length;
  const totalInterns = users.filter(u => u.role === 'Intern').length;
  const todayPresent = records.filter(r => ['Present', 'Late', 'Half-Day'].includes(r.attendanceStatus)).length;
  const todayLate = records.filter(r => r.attendanceStatus === 'Late').length;
  const todayActiveSchedules = records.filter(r => r.sessions.some(s => !s.checkOut)).length;
  const attendanceRate = totalStaff > 0 ? Math.round((todayPresent / totalStaff) * 100) : 0;

  const filteredRecords = records.filter(record => 
    record.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.userId?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !refreshing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
        <p className="mt-4 text-sm text-odizo-grey">Loading dashboard portal...</p>
      </div>
    );
  }

  // ----------------- RENDER EMPLOYEE/INTERN DASHBOARD -----------------
  if (currentUser && currentUser.role !== 'Admin') {
    return (
      <div className="space-y-6">
        {/* Profile Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-odizo-grey to-white bg-clip-text text-transparent">
              Welcome back, {currentUser.name}!
            </h1>
            <p className="text-sm text-odizo-grey mt-1">
              Logged in as <span className="text-white font-medium">{currentUser.role}</span>
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-odizo-red/30 text-white rounded-full text-sm font-semibold transition-all duration-300 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh Stats</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Punch In / Out Card (Left 2/3) */}
          <div className="lg:col-span-2 glass-card p-8 border-white/10 floating-shadow-red flex flex-col justify-between relative overflow-hidden">
            {/* Background Red Glow */}
            <div className="absolute -right-16 -bottom-16 w-60 h-60 bg-odizo-red/5 rounded-full blur-[60px] pointer-events-none"></div>

            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold">Shift Clock</h2>
                  <p className="text-xs text-odizo-grey mt-0.5">
                    Assigned Shift: <span className="text-white font-semibold">{currentUser.shift?.name}</span> ({currentUser.shift?.startTime} - {currentUser.shift?.endTime})
                  </p>
                </div>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                  isCheckedIn 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20 animate-pulse' 
                    : 'bg-white/5 text-odizo-grey border border-white/5'
                }`}>
                  {isCheckedIn ? 'Active On-Shift' : 'Off-Shift'}
                </span>
              </div>

              {/* GPS Coordinates lock check */}
              {geoError && (
                <div className="flex items-center gap-2 bg-odizo-red/10 border border-odizo-red/25 rounded-xl p-3 mb-6 text-xs text-odizo-red">
                  <AlertCircle size={16} />
                  <span>{geoError}</span>
                </div>
              )}

              {/* Big Glowing Timer & Button */}
              <div className="flex flex-col items-center justify-center py-6">
                <div className="font-mono text-5xl font-extrabold tracking-widest text-white mb-6 bg-white/5 border border-white/10 rounded-2xl px-6 py-3 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                  {liveTimer}
                </div>

                <button
                  onClick={handlePunch}
                  disabled={punchLoading}
                  className={`relative flex items-center justify-center gap-3 w-48 h-48 rounded-full font-extrabold text-lg uppercase transition-all duration-500 shadow-xl ${
                    isCheckedIn
                      ? 'bg-odizo-red hover:shadow-[0_0_40px_rgba(225,97,103,0.4)] text-white hover:scale-105 active:scale-95'
                      : 'bg-white text-black hover:bg-white/95 hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95'
                  } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                >
                  <div className="absolute inset-2 rounded-full border border-current opacity-20"></div>
                  {punchLoading ? (
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  ) : isCheckedIn ? (
                    <>
                      <Square size={20} fill="currentColor" />
                      <span>Punch Out</span>
                    </>
                  ) : (
                    <>
                      <Play size={20} fill="currentColor" className="ml-1" />
                      <span>Punch In</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Geolocation & Note Field */}
            <div className="mt-8 border-t border-white/5 pt-6 space-y-4">
              <div className="flex items-center gap-2 text-xs text-odizo-grey">
                <MapPin size={14} className="text-odizo-red" />
                {geoCoordinates ? (
                  <span>GPS Lock: 127.0.0.1 Location ({geoCoordinates.lat.toFixed(4)}, {geoCoordinates.lng.toFixed(4)})</span>
                ) : (
                  <span>Acquiring GPS location lock...</span>
                )}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Add notes (e.g. Work location details, site notes...)"
                  value={punchNotes}
                  onChange={(e) => setPunchNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Daily Summary statistics (Right 1/3) */}
          <div className="glass-card p-6 border-white/5 floating-shadow flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold mb-4">Today's Summary</h2>
              <div className="space-y-4">
                <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-odizo-grey uppercase tracking-wider font-semibold">Total Hours Today</span>
                  <p className="text-lg font-bold text-white mt-1">
                    {todayRecord
                      ? `${Math.floor(todayRecord.totalMinutesWorked / 60)}h ${todayRecord.totalMinutesWorked % 60}m`
                      : '0h 0m'}
                  </p>
                </div>

                <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-odizo-grey uppercase tracking-wider font-semibold">Checks count</span>
                  <p className="text-lg font-bold text-white mt-1">
                    {todayRecord ? todayRecord.sessions.length : 0} Session(s)
                  </p>
                </div>

                <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
                  <span className="text-[10px] text-odizo-grey uppercase tracking-wider font-semibold">Shift Status</span>
                  <p className="text-lg font-bold text-white mt-1">
                    {todayRecord ? (
                      <span className={todayRecord.attendanceStatus === 'Present' ? 'text-green-400' : 'text-amber-400'}>
                        {todayRecord.attendanceStatus}
                      </span>
                    ) : (
                      <span className="text-odizo-grey">Not Started</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-odizo-grey border-t border-white/5 pt-4 mt-6">
              Records are saved to ODIZO Attendance Server and audited for payroll compliance.
            </div>
          </div>
        </div>

        {/* Personal Log history */}
        <div className="glass-card p-6 floating-shadow border-white/5">
          <h2 className="text-xl font-bold mb-4">Recent Shifts Logs</h2>
          {records.length === 0 ? (
            <p className="text-center text-xs text-odizo-grey py-10">No past attendance logs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-odizo-grey font-medium text-xs uppercase">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Shift Name</th>
                    <th className="py-3 px-4">Punch In / Out Times</th>
                    <th className="py-3 px-4">Hours Logged</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {records.map((record) => (
                    <tr key={record._id} className="hover:bg-white/3 transition-colors">
                      <td className="py-4 px-4 font-mono font-semibold text-white">
                        {record.date}
                      </td>
                      <td className="py-4 px-4 font-semibold text-white">
                        {record.shiftSnapshot?.name}
                      </td>
                      <td className="py-4 px-4 text-xs text-white">
                        <div className="space-y-1">
                          {record.sessions.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[9px]">
                                Session {idx + 1}
                              </span>
                              <span>
                                {new Date(s.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {s.checkOut ? ` - ${new Date(s.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (Active)'}
                              </span>
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

  // ----------------- RENDER ADMINISTRATOR DASHBOARD -----------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-odizo-grey to-white bg-clip-text text-transparent">
            Attendance Dashboard
          </h1>
          <p className="text-sm text-odizo-grey mt-1">Real-time attendance intelligence & shifts tracking</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-odizo-red/30 text-white rounded-full text-sm font-semibold transition-all duration-300 shadow-md hover:shadow-red-900/10 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Logs'}</span>
        </button>
      </div>

      {/* Floating Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Staff Card */}
        <div className="glass-card glass-card-hover p-6 floating-shadow border-white/5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-odizo-grey uppercase tracking-wider">Total Staff</span>
              <h3 className="text-3xl font-bold mt-2">{totalStaff}</h3>
              <p className="text-xs text-odizo-grey mt-1">
                {totalEmployees} Employees / {totalInterns} Interns
              </p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-white">
              <Users size={20} />
            </div>
          </div>
        </div>

        {/* Present Today Card */}
        <div className="glass-card glass-card-hover p-6 floating-shadow border-white/5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-odizo-grey uppercase tracking-wider">Present Today</span>
              <h3 className="text-3xl font-bold mt-2 text-green-400">{todayPresent}</h3>
              <p className="text-xs text-odizo-grey mt-1">
                {todayLate} checked in late
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-green-400">
              <UserCheck size={20} />
            </div>
          </div>
        </div>

        {/* Active Punches Card */}
        <div className="glass-card glass-card-hover p-6 floating-shadow border-white/5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-odizo-grey uppercase tracking-wider">Currently On-Shift</span>
              <h3 className="text-3xl font-bold mt-2 text-odizo-red">{todayActiveSchedules}</h3>
              <p className="text-xs text-odizo-grey mt-1">
                Active live timers running
              </p>
            </div>
            <div className="p-3 bg-odizo-red/10 rounded-xl border border-odizo-red/20 text-odizo-red">
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* Attendance Rate Card */}
        <div className="glass-card glass-card-hover p-6 floating-shadow border-white/5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-odizo-grey uppercase tracking-wider">Attendance Rate</span>
              <h3 className="text-3xl font-bold mt-2 text-blue-400">{attendanceRate}%</h3>
              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2 overflow-hidden border border-white/5">
                <div 
                  className="bg-blue-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Attendance Feed (Left 2/3) */}
        <div className="xl:col-span-2 glass-card p-6 floating-shadow border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold">Live Attendance Feed</h2>
              <p className="text-xs text-odizo-grey">Live punch updates for {todayStr}</p>
            </div>
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none focus:ring-0 transition-colors"
              />
              <Search className="absolute left-3.5 top-2.5 text-odizo-grey" size={13} />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
              <p className="mt-4 text-sm text-odizo-grey">Loading today's logs...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
              <UserCheck size={40} className="mx-auto text-odizo-grey/50 mb-3" />
              <p className="text-sm font-semibold text-white">No attendance records found</p>
              <p className="text-xs text-odizo-grey mt-1">No check-ins have been recorded today yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-odizo-grey font-medium text-xs uppercase">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Shift</th>
                    <th className="py-3 px-4">Active Punches</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRecords.map((record) => {
                    const activeSession = record.sessions.find(s => !s.checkOut);
                    const lastSession = record.sessions[record.sessions.length - 1];
                    const punchTime = lastSession 
                      ? new Date(lastSession.checkOut || lastSession.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';
                    const location = lastSession?.checkOutLocation || lastSession?.checkInLocation;

                    return (
                      <tr key={record._id} className="hover:bg-white/3 transition-colors">
                        <td className="py-4 px-4 font-semibold text-white">
                          <div className="flex flex-col">
                            <span>{record.userId?.name || 'Unknown User'}</span>
                            <span className="text-xs text-odizo-grey font-normal">{record.userId?.email}</span>
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
                        <td className="py-4 px-4 text-xs">
                          <div className="flex flex-col text-odizo-grey">
                            <span className="font-medium text-white">{record.shiftSnapshot?.name}</span>
                            <span>{record.shiftSnapshot?.startTime} - {record.shiftSnapshot?.endTime}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-xs font-medium text-white">
                          <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${activeSession ? 'bg-green-500 animate-pulse' : 'bg-odizo-grey'}`} />
                            <span>
                              {activeSession 
                                ? `In at ${new Date(activeSession.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                                : `Out at ${punchTime}`}
                            </span>
                            {location && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-odizo-red hover:underline flex items-center gap-0.5"
                                title={location.address || 'Show Map'}
                              >
                                <MapPin size={11} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono font-medium text-white">
                          {record.totalMinutesWorked > 0
                            ? `${Math.floor(record.totalMinutesWorked / 60)}h ${record.totalMinutesWorked % 60}m`
                            : activeSession 
                              ? 'Active...' 
                              : '0m'}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* System Activity (Right 1/3) */}
        <div className="glass-card p-6 floating-shadow border-white/5">
          <h2 className="text-xl font-bold mb-4">Device Audits</h2>
          <p className="text-xs text-odizo-grey mb-6">Device compliance tracking for today's logs</p>

          {loading ? (
            <p className="text-center text-sm text-odizo-grey py-10">Loading audit feed...</p>
          ) : records.length === 0 ? (
            <p className="text-center text-xs text-odizo-grey py-10">No device logs available.</p>
          ) : (
            <div className="space-y-4">
              {records.slice(0, 5).map((record) => {
                const lastSession = record.sessions[record.sessions.length - 1];
                if (!lastSession) return null;
                const device = lastSession.checkOutDevice || lastSession.checkInDevice || 'Unknown device';
                const timeStr = new Date(lastSession.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={record._id} className="flex gap-4 p-3 bg-white/3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="p-2 bg-white/5 rounded-lg text-odizo-grey self-start">
                      <Monitor size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-white">{record.userId?.name}</p>
                      <p className="text-xs text-odizo-grey truncate">{device}</p>
                      <span className="text-[10px] text-odizo-red font-medium mt-1 inline-block">Checked in at {timeStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
