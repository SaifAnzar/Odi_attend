'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Users, ArrowRight, UserCheck } from 'lucide-react';

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

interface ShiftGroup {
  name: string;
  startTime: string;
  endTime: string;
  staff: User[];
}

export default function Shifts() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users.filter((u: User) => u.role !== 'Admin'));
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Group staff by shift signature (name + start + end)
  const shiftGroupsMap: { [key: string]: ShiftGroup } = {};

  users.forEach((user) => {
    const shift = user.shift || { name: 'Standard Shift', startTime: '09:00', endTime: '18:00' };
    const key = `${shift.name}-${shift.startTime}-${shift.endTime}`;
    if (!shiftGroupsMap[key]) {
      shiftGroupsMap[key] = {
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        staff: []
      };
    }
    shiftGroupsMap[key].staff.push(user);
  });

  const shiftGroups = Object.values(shiftGroupsMap);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-odizo-grey to-white bg-clip-text text-transparent">
          Working Hours & Shifts
        </h1>
        <p className="text-sm text-odizo-grey mt-1">Configure and assign shift hours to employees or interns</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
          <p className="mt-4 text-sm text-odizo-grey">Loading shifts data...</p>
        </div>
      ) : shiftGroups.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <Clock size={40} className="mx-auto text-odizo-grey/50 mb-3" />
          <p className="text-sm font-semibold text-white">No active shifts configured</p>
          <p className="text-xs text-odizo-grey mt-1">Please add staff in User Management to assign shifts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {shiftGroups.map((group, index) => (
            <div key={index} className="glass-card p-6 floating-shadow border-white/5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="inline-flex px-3 py-1 bg-odizo-red/10 border border-odizo-red/20 text-odizo-red text-xs font-bold rounded-full">
                    {group.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-odizo-grey">
                    <Users size={14} />
                    <span>{group.staff.length} Assigned</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/3 border border-white/5 rounded-2xl p-4 mb-6">
                  <div className="p-3 bg-white/5 text-odizo-red rounded-xl">
                    <Clock size={20} />
                  </div>
                  <div>
                    <span className="text-xs text-odizo-grey uppercase tracking-wider font-semibold">Active Hours</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold text-white">{group.startTime}</span>
                      <ArrowRight size={14} className="text-odizo-grey" />
                      <span className="text-lg font-bold text-white">{group.endTime}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-3">Assigned Staff</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 pr-1">
                    {group.staff.map((user) => (
                      <div key={user._id} className="flex justify-between items-center p-2.5 bg-white/3 hover:bg-white/5 rounded-xl border border-white/5 transition-all duration-300">
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-white">{user.name}</p>
                          <p className="text-[10px] text-odizo-grey truncate">{user.email}</p>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          user.role === 'Employee' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 mt-6 text-xs text-odizo-grey flex items-center justify-between">
                <span>Manage shift hour mappings inside User Management</span>
                <span className="font-semibold text-white">GMT+5:30</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
