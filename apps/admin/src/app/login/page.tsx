'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

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
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/admin/dashboard');
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
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 relative overflow-hidden transition-colors duration-300">
      <div className="w-full max-w-md">
        {/* Dark theme login card */}
        <div className="bg-[#0a0a0a] border border-zinc-900 rounded-2xl p-8 shadow-2xl relative">
          {/* Logo at the top of the card */}
          <div className="flex flex-col items-center text-center mt-2 mb-6">
            <Logo size="md" variant="dark" />
            <h2 className="text-2xl font-bold tracking-tight text-white mt-6">
              Admin Access
            </h2>
          </div>

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
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@odizo.in"
                className="w-full bg-[#030303] border border-zinc-800/80 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:border-odizo-red focus:outline-none transition-colors"
              />
            </div>

            {/* Password Field */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#030303] border border-zinc-800/80 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:border-odizo-red focus:outline-none transition-colors"
              />
            </div>

            {/* Submit Button with Red Gradient */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#e16167] to-[#e10b14] text-white py-3.5 rounded-xl text-sm font-bold hover:opacity-95 hover:shadow-[0_0_20px_rgba(225,97,103,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
