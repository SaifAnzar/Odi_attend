'use client';

import React from 'react';
import { Calendar, Home, ArrowLeftRight } from 'lucide-react';

export interface EmployeeQuickStatsProps {
  leaveCount?: number;
  wfhCount?: number;
  swapCount?: number;
}

/**
 * A highly polished, premium glassmorphic component to display quick counts
 * of an employee's activities (Leaves, WFH, and Shift Swaps).
 */
export function EmployeeQuickStats({
  leaveCount = 4,
  wfhCount = 12,
  swapCount = 2
}: EmployeeQuickStatsProps) {
  const stats = [
    {
      label: 'Total Leaves',
      count: leaveCount,
      icon: Calendar,
      colorClass: 'border-l-rose-500/60 dark:border-l-rose-500/80 hover:border-rose-500/30 text-rose-500 dark:text-rose-400',
      bgGlow: 'bg-rose-500/5 dark:bg-rose-500/10',
      iconBg: 'bg-rose-500/10 border-rose-500/25 dark:border-rose-500/20 text-rose-500 dark:text-rose-400',
    },
    {
      label: 'Total WFH',
      count: wfhCount,
      icon: Home,
      colorClass: 'border-l-purple-500/60 dark:border-l-purple-500/80 hover:border-purple-500/30 text-purple-500 dark:text-purple-400',
      bgGlow: 'bg-purple-500/5 dark:bg-purple-500/10',
      iconBg: 'bg-purple-500/10 border-purple-500/25 dark:border-purple-500/20 text-purple-500 dark:text-purple-400',
    },
    {
      label: 'Total Swaps',
      count: swapCount,
      icon: ArrowLeftRight,
      colorClass: 'border-l-sky-500/60 dark:border-l-sky-500/80 hover:border-sky-500/30 text-sky-500 dark:text-sky-400',
      bgGlow: 'bg-sky-500/5 dark:bg-sky-500/10',
      iconBg: 'bg-sky-500/10 border-sky-500/25 dark:border-sky-500/20 text-sky-500 dark:text-sky-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`relative overflow-hidden glass-card p-4 flex items-center justify-between border-l-4 ${stat.colorClass} border-t border-r border-b border-black/5 dark:border-white/5 transition-all duration-300 hover:scale-[1.01] hover:bg-black/5 dark:hover:bg-white/5`}
          >
            {/* Soft Ambient Radial Background Glow */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 ${stat.bgGlow} rounded-full blur-[24px] pointer-events-none opacity-60 dark:opacity-80`}></div>

            <div className="space-y-1.5 z-10 select-none">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-gray-400">
                {stat.label}
              </span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none font-sans">
                {stat.count}
              </p>
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center justify-center ${stat.iconBg} z-10`}>
              <Icon size={16} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
