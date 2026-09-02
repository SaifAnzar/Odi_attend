'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  AlertCircle
} from 'lucide-react';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { EmployeeQuickStats } from '@/components/ui/EmployeeQuickStats';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; role: string; email: string; shift?: any } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted) return null;

  const handleLogout = () => {
    document.cookie = 'token=; Max-Age=0; path=/;';
    localStorage.removeItem('user');
    router.push('/login');
  };

  const userRole = user?.role ? user.role.toUpperCase() : 'EMPLOYEE';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors duration-300 flex flex-col">
      {/* Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 glass-card m-4 border-black/5 dark:border-white/5">
        <Logo size="md" />

        <div className="flex items-center gap-5">
          <ThemeToggle />
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold">{user ? user.name : 'Loading...'}</span>
              <span className="text-xs text-odizo-grey uppercase tracking-wider">{userRole} Portal</span>
            </div>
            <div className="h-10 w-10 rounded-full border border-odizo-red/20 bg-odizo-red/5 flex items-center justify-center text-odizo-red shadow-[0_0_10px_rgba(225,97,103,0.15)]">
              <UserIcon size={18} />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-odizo-grey hover:text-odizo-red hover:bg-odizo-red/10 border border-transparent hover:border-odizo-red/20 transition-all duration-300 text-sm font-medium"
            title="Logout"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border border-white/10 shadow-2xl">
          <div className="absolute right-0 top-0 w-96 h-96 bg-odizo-red/10 rounded-full blur-3xl -z-10 pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-odizo-red/10 text-odizo-red border border-odizo-red/20 mb-3 uppercase tracking-wider">
                ODIZO Attendance Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {user?.name || 'User'}! 👋
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Role: <span className="font-semibold text-white uppercase">{userRole}</span> • Track your shift, requests, and announcements.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-md">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Standard Shift</div>
                <div className="text-sm font-bold text-white">
                  {user?.shift?.startTime || '09:00'} - {user?.shift?.endTime || '18:00'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Component */}
        <EmployeeQuickStats leaveCount={0} wfhCount={0} swapCount={0} />

        {/* Action Grid & Announcements */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl glass-card border-black/5 dark:border-white/5 flex flex-col justify-between hover:border-odizo-red/30 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
                <Calendar size={20} />
              </div>
              <span className="text-xs font-medium text-gray-400">Leaves</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Leave Requests</h3>
              <p className="text-xs text-gray-400 mt-1">Submit and view leave status</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-card border-black/5 dark:border-white/5 flex flex-col justify-between hover:border-odizo-red/30 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Home size={20} />
              </div>
              <span className="text-xs font-medium text-gray-400">WFH</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Work From Home</h3>
              <p className="text-xs text-gray-400 mt-1">Apply for remote working</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-card border-black/5 dark:border-white/5 flex flex-col justify-between hover:border-odizo-red/30 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform">
                <RefreshCw size={20} />
              </div>
              <span className="text-xs font-medium text-gray-400">Swaps</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Shift Swaps</h3>
              <p className="text-xs text-gray-400 mt-1">Request shift exchanges</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-card border-black/5 dark:border-white/5 flex flex-col justify-between hover:border-odizo-red/30 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
                <Megaphone size={20} />
              </div>
              <span className="text-xs font-medium text-gray-400">Notice</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Announcements</h3>
              <p className="text-xs text-gray-400 mt-1">View ODIZO notices</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
