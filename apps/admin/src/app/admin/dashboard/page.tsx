'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  MapPin, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Search,
  Monitor
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
  status: 'Present' | 'Absent' | 'Late' | 'Half-Day' | 'Off-Day';
  totalMinutesWorked: number;
}

export default function Dashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch users
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      
      // Fetch today's attendance
      const attendanceRes = await fetch(`/api/attendance?date=${todayStr}`);
      const attendanceData = await attendanceRes.json();

      if (usersData.users) {
        setUsers(usersData.users.filter((u: User) => u.role !== 'Admin'));
      }
      if (attendanceData.records) {
        setRecords(attendanceData.records);
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
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Calculate metrics
  const totalStaff = users.length;
  const totalEmployees = users.filter(u => u.role === 'Employee').length;
  const totalInterns = users.filter(u => u.role === 'Intern').length;
  
  // Today's stats
  const todayPresent = records.filter(r => ['Present', 'Late', 'Half-Day'].includes(r.status)).length;
  const todayLate = records.filter(r => r.status === 'Late').length;
  const todayActiveSchedules = records.filter(r => r.sessions.some(s => !s.checkOut)).length;
  
  const attendanceRate = totalStaff > 0 ? Math.round((todayPresent / totalStaff) * 100) : 0;

  // Filter records based on search
  const filteredRecords = records.filter(record => 
    record.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.userId?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                            record.status === 'Present' 
                              ? 'bg-green-500/15 text-green-400' 
                              : record.status === 'Late'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-red-500/15 text-red-400'
                          }`}>
                            {record.status}
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
