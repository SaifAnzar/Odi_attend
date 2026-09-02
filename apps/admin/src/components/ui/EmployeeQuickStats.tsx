'use client';

import React from 'react';
import { Calendar, Home, ArrowLeftRight } from 'lucide-react';

export interface EmployeeQuickStatsProps {
  leaveCount?: number;
  wfhCount?: number;
  swapCount?: number;
}

/**
 * A highly polished, reusable EmployeeQuickStats component
 * that displays the total counts for Leaves, WFH (Work From Home), and Shift Swaps.
 * Designed with a premium, glassmorphic look suitable for ODIZO Admin Panel.
 */
export function EmployeeQuickStats({
  leaveCount = 0,
  wfhCount = 0,
  swapCount = 0,
}: EmployeeQuickStatsProps) {
  const stats = [
    {
      label: 'Approved Leaves',
      count: leaveCount,
      unit: 'Days',
      icon: Calendar,
      badgeColor: 'bg-rose-500/10 border-rose-500/25 text-rose-500 dark:text-rose-400',
      textColor: 'text-rose-600 dark:text-rose-400',
      bgCard: 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40',
    },
    {
      label: 'Approved WFH',
      count: wfhCount,
      unit: 'Days',
      icon: Home,
      badgeColor: 'bg-purple-500/10 border-purple-500/25 text-purple-500 dark:text-purple-400',
      textColor: 'text-purple-600 dark:text-purple-400',
      bgCard: 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/40',
    },
    {
      label: 'Shift Swaps',
      count: swapCount,
      unit: 'Completed',
      icon: ArrowLeftRight,
      badgeColor: 'bg-sky-500/10 border-sky-500/25 text-sky-500 dark:text-sky-400',
      textColor: 'text-sky-600 dark:text-sky-400',
      bgCard: 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/40',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`p-3.5 rounded-2xl border ${stat.bgCard} flex items-center justify-between transition-colors shadow-sm`}
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.label}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {stat.count}
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {stat.unit}
                </span>
              </div>
            </div>

            <div className={`p-2.5 rounded-xl border ${stat.badgeColor} flex items-center justify-center shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Demo Component to show how to use EmployeeQuickStats with dummy data.
 * Used for visual verification of the component.
 */
export function EmployeeQuickStatsDemo() {
  return (
    <div className="p-6 bg-slate-950 rounded-3xl border border-white/5 max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white">Employee Quick Stats</h3>
        <p className="text-xs text-gray-400">Previewing with dummy data: Leave = 4, WFH = 12, Swaps = 2</p>
      </div>
      <EmployeeQuickStats leaveCount={4} wfhCount={12} swapCount={2} />
    </div>
  );
}
