'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon,
  Settings
} from 'lucide-react';
import Logo from '@/components/Logo';

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}

function SidebarItem({ href, icon, label, active, onClick }: SidebarItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        active 
          ? 'bg-odizo-red/10 border border-odizo-red/20 text-odizo-red font-medium shadow-[0_0_15px_rgba(225,97,103,0.1)]' 
          : 'text-odizo-grey hover:text-white hover:bg-white/5 border border-transparent'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string; email: string } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = async () => {
    // Delete token cookie
    document.cookie = 'token=; Max-Age=0; path=/;';
    localStorage.removeItem('user');
    router.push('/login');
  };

  const navItems = [
    { href: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  ];

  if (user?.role === 'Admin') {
    navItems.push(
      { href: '/admin/users', icon: <Users size={20} />, label: 'User Management' },
      { href: '/admin/shifts', icon: <Clock size={20} />, label: 'Working Hours' },
      { href: '/admin/reports', icon: <FileText size={20} />, label: 'Reports' },
      { href: '/admin/settings', icon: <Settings size={20} />, label: 'Settings' }
    );
  } else if (user?.role === 'Employee' || user?.role === 'Intern') {
    navItems.push(
      { href: '/admin/reports', icon: <FileText size={20} />, label: 'History' }
    );
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 glass-card m-4 mr-0 p-5 floating-shadow border-white/5">
        <div className="mb-8 flex items-center justify-center border-b border-white/5 pb-5">
          <Logo size="md" />
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href}
            />
          ))}
        </nav>

        <div className="border-t border-white/5 pt-5 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-odizo-grey hover:text-odizo-red hover:bg-odizo-red/10 border border-transparent hover:border-odizo-red/20 transition-all duration-300"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
          <aside className="w-64 bg-black/90 border-r border-white/10 p-5 flex flex-col h-full animate-float-in">
            <div className="flex items-center justify-between mb-8 pb-5 border-b border-white/5">
              <Logo size="sm" />
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg text-odizo-grey hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {navItems.map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname === item.href}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
            </nav>

            <div className="border-t border-white/5 pt-5">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-odizo-grey hover:text-odizo-red hover:bg-odizo-red/10 border border-transparent transition-all duration-300"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
          <div className="flex-1" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between md:justify-end px-6 py-4 glass-card m-4 mb-0 border-white/5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-odizo-grey hover:text-white hover:bg-white/5 border border-white/10"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold">{user ? user.name : 'Loading User...'}</span>
              <span className="text-xs text-odizo-grey">{user ? `${user.role} Portal` : 'Portal'}</span>
            </div>
            <div className="h-10 w-10 rounded-full border border-odizo-red/20 bg-odizo-red/5 flex items-center justify-center text-odizo-red shadow-[0_0_10px_rgba(225,97,103,0.15)]">
              <UserIcon size={18} />
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/5">
          {children}
        </main>
      </div>
    </div>
  );
}
