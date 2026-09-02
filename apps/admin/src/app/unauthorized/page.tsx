'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import Logo from '@/components/Logo';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 relative overflow-hidden">
      <div className="w-full max-w-md">
        <div className="bg-[#0a0a0a] border border-zinc-900 rounded-2xl p-8 shadow-2xl relative text-center flex flex-col items-center">
          <Logo size="md" variant="dark" />

          <div className="mt-8 mb-4 h-16 w-16 rounded-full bg-odizo-red/10 border border-odizo-red/30 flex items-center justify-center text-odizo-red shadow-[0_0_20px_rgba(225,97,103,0.2)]">
            <ShieldAlert size={32} />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-odizo-red/10 text-odizo-red border border-odizo-red/20 mb-3">
            <Lock size={12} />
            403 Access Denied
          </span>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Unauthorized Access
          </h1>

          <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
            You do not have the required permissions to view this Admin section in the <strong className="text-white">ODIZO</strong> system. If you believe this is an error, please contact your System Administrator.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link
              href="/dashboard"
              className="flex-1 bg-gradient-to-r from-[#e16167] to-[#e10b14] text-white py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-95 hover:shadow-[0_0_20px_rgba(225,97,103,0.3)] transition-all duration-300"
            >
              <ArrowLeft size={16} />
              Go to Dashboard
            </Link>

            <Link
              href="/login"
              className="flex-1 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 py-3 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
