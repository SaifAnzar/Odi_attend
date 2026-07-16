'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Users, ArrowRight, Globe, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [expandedShifts, setExpandedShifts] = useState<{ [key: string]: boolean }>({});

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

  const toggleExpand = (key: string) => {
    setExpandedShifts((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-odizo-grey to-white bg-clip-text text-transparent">
            Working Hours & Shifts
          </h1>
          <p className="text-sm text-odizo-grey mt-1">Configure and assign shift hours to employees or interns</p>
        </div>
        <div className="text-xs text-odizo-grey bg-white/5 border border-white/5 rounded-xl px-4 py-2 self-start md:self-auto">
          Manage shift mappings inside <span className="font-semibold text-white">User Management</span>
        </div>
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
        <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#0f0f13] backdrop-blur-md">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/3">
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider uppercase text-gray-400">Shift Name</th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider uppercase text-gray-400">Active Hours</th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider uppercase text-gray-400">Total Assigned</th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider uppercase text-gray-400">Assigned Staff</th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider uppercase text-gray-400">Timezone</th>
                  <th className="px-6 py-4 text-xs font-semibold tracking-wider uppercase text-gray-400 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shiftGroups.map((group, index) => {
                  const key = `${group.name}-${group.startTime}-${group.endTime}`;
                  const isExpanded = !!expandedShifts[key];
                  return (
                    <React.Fragment key={index}>
                      {/* Main Row */}
                      <tr 
                        onClick={() => toggleExpand(key)}
                        className="hover:bg-white/5 transition-all duration-200 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-3 py-1 bg-odizo-red/10 border border-odizo-red/20 text-odizo-red text-xs font-bold rounded-full">
                            {group.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-white">
                            <Clock size={14} className="text-odizo-red" />
                            <span className="text-sm font-semibold">{group.startTime}</span>
                            <ArrowRight size={12} className="text-odizo-grey" />
                            <span className="text-sm font-semibold">{group.endTime}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-semibold text-white">
                            <Users size={12} className="text-odizo-grey" />
                            <span>{group.staff.length} Staff</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {group.staff.length === 0 ? (
                            <span className="text-xs text-gray-500 italic">No staff assigned</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {group.staff.slice(0, 2).map((user) => (
                                <span 
                                  key={user._id} 
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[11px] text-white"
                                >
                                  <span className="font-medium truncate max-w-[80px]">{user.name}</span>
                                  <span className={`inline-flex px-1 rounded text-[9px] font-bold ${
                                    user.role === 'Employee' 
                                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  }`}>
                                    {user.role}
                                  </span>
                                </span>
                              ))}
                              {group.staff.length > 2 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-odizo-red/10 border border-odizo-red/20 text-odizo-red text-[10px] font-bold">
                                  +{group.staff.length - 2} more
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-odizo-grey font-medium">
                            <Globe size={14} className="text-odizo-grey/70" />
                            <span>GMT+5:30</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(key);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-odizo-grey hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors"
                          >
                            <span>{isExpanded ? 'Hide' : 'Details'}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Accordion Sub-row */}
                      {isExpanded && (
                        <tr className="bg-white/[0.01]">
                          <td colSpan={6} className="px-6 py-5 border-t border-white/5">
                            <div className="space-y-4 animate-fade-in">
                              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                                  Assigned Staff Details ({group.staff.length})
                                </span>
                                <span className="text-[10px] text-odizo-grey">
                                  To add/remove staff, edit user profiles in User Management
                                </span>
                              </div>
                              {group.staff.length === 0 ? (
                                <p className="text-xs text-gray-500 italic">No staff members in this shift.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 pr-1">
                                  {group.staff.map((user) => (
                                    <div 
                                      key={user._id} 
                                      className="flex flex-col justify-between p-3 bg-white/3 hover:bg-white/5 rounded-xl border border-white/5 transition-all duration-300"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold truncate text-white">{user.name}</p>
                                        <p className="text-[10px] text-odizo-grey truncate mt-0.5">{user.email}</p>
                                      </div>
                                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                          user.role === 'Employee' 
                                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                        }`}>
                                          {user.role}
                                        </span>
                                        <span className={`text-[9px] font-semibold ${
                                          user.status === 'Active' ? 'text-green-400' : 'text-gray-400'
                                        }`}>
                                          {user.status}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
