'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user.role === 'Admin') {
          router.push('/admin/dashboard');
        } else {
          setError('Access denied. Non-admin accounts must use the mobile application.');
        }
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Please check if server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 relative overflow-hidden">
      {/* Background glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-odizo-red/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 animate-float">
        {/* Logo and title */}
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" className="mb-2" />
          <h2 className="text-xl font-bold tracking-tight text-white mt-4">
            Attendance Portal
          </h2>
          <p className="text-xs text-odizo-grey mt-1">
            Secure admin access panel
          </p>
        </div>

        {/* Glassmorphic Card */}
        <div className="glass-card p-8 border-white/10 floating-shadow-red">
          {error && (
            <div className="flex items-center gap-2 bg-odizo-red/10 border border-odizo-red/25 rounded-xl p-3 mb-6 text-xs text-odizo-red">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@odizo.in"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none focus:ring-0 transition-colors"
                />
                <Mail className="absolute left-3.5 top-3.5 text-odizo-grey" size={16} />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none focus:ring-0 transition-colors"
                />
                <Lock className="absolute left-3.5 top-3.5 text-odizo-grey" size={16} />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-odizo-red text-white py-3 rounded-full text-sm font-bold hover:bg-opacity-95 hover:shadow-[0_0_20px_rgba(225,97,103,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] text-odizo-grey">
          © {new Date().getFullYear()} ODIZO. All rights reserved.
        </p>
      </div>
    </div>
  );
}
