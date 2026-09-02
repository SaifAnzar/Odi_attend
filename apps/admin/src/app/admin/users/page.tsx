'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Check, 
  User as UserIcon, 
  Mail, 
  Clock, 
  Search,
  AlertCircle
} from 'lucide-react';
import { showConfirm, showError, showSuccess } from '@/lib/swal';
import { EmployeeQuickStats } from '@/components/ui/EmployeeQuickStats';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Employee' | 'Intern';
  workMode?: 'On-Site' | 'Remote' | 'Hybrid';
  status: 'Active' | 'Inactive';
  baseSalary?: number;
  stats?: {
    approvedLeaves: number;
    approvedWfh: number;
    approvedSwaps: number;
  };
  shift: {
    name: string;
    startTime: string;
    endTime: string;
  };
  createdAt: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [error, setError] = useState('');
  const [selectedUserStats, setSelectedUserStats] = useState<{ approvedLeaves: number; approvedWfh: number; approvedSwaps: number } | null>(null);
  
  // Form fields
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'Employee' | 'Intern'>('Employee');
  const [workMode, setWorkMode] = useState<'On-Site' | 'Remote' | 'Hybrid'>('On-Site');
  const [baseSalary, setBaseSalary] = useState<number>(65000);
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [shiftName, setShiftName] = useState('Standard Shift');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');

  // Role change with auto-fill suggested base salary
  const handleRoleChange = (newRole: 'Admin' | 'Employee' | 'Intern') => {
    setRole(newRole);
    if (newRole === 'Employee') setBaseSalary(65000);
    else if (newRole === 'Intern') setBaseSalary(25000);
    else if (newRole === 'Admin') setBaseSalary(90000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
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

  const handleOpenCreate = () => {
    setModalMode('create');
    setError('');
    setUserId('');
    setName('');
    setEmail('');
    setPassword('');
    setRole('Employee');
    setWorkMode('On-Site');
    setBaseSalary(65000);
    setStatus('Active');
    setShiftName('Standard Shift');
    setShiftStart('09:00');
    setShiftEnd('18:00');
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setModalMode('edit');
    setError('');
    setSelectedUserStats(user.stats || { approvedLeaves: 0, approvedWfh: 0, approvedSwaps: 0 });
    setUserId(user._id);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // leave blank if no password change
    setRole(user.role);
    setWorkMode(user.workMode || 'On-Site');
    setBaseSalary(user.baseSalary || (user.role === 'Intern' ? 25000 : user.role === 'Admin' ? 90000 : 65000));
    setStatus(user.status);
    setShiftName(user.shift?.name || 'Standard Shift');
    setShiftStart(user.shift?.startTime || '09:00');
    setShiftEnd(user.shift?.endTime || '18:00');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Delete Profile', 'Are you sure you want to delete this user profile?');
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showSuccess('Deleted!', 'User profile deleted successfully.');
        fetchUsers();
      } else {
        showError('Delete Failed', data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }

    if (modalMode === 'create' && !password.trim()) {
      setError('Password is required for new users.');
      return;
    }

    try {
      const payload: any = {
        name,
        email,
        role,
        workMode,
        baseSalary: Number(baseSalary),
        status,
        shift: {
          name: shiftName,
          startTime: shiftStart,
          endTime: shiftEnd
        }
      };

      if (password.trim()) {
        payload.password = password;
      }

      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        showSuccess(
          modalMode === 'create' ? 'Created!' : 'Updated!',
          modalMode === 'create' ? 'User profile has been created.' : 'User profile updated successfully.'
        );
        fetchUsers();
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">User Management</h1>
          <p className="text-sm text-odizo-grey mt-1">Manage employees, interns, shift assignments and work mode permissions.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-60 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-900 dark:text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none transition-colors"
            />
            <Search className="absolute left-3 top-2.5 text-odizo-grey" size={14} />
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-odizo-red text-slate-900 dark:text-white text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(225,97,103,0.3)] hover:opacity-90 transition-all duration-300 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-2xl p-6 border-black/5 dark:border-white/5 floating-shadow">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
            <p className="mt-4 text-sm text-odizo-grey">Loading user directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
            <UserIcon size={40} className="mx-auto text-odizo-grey/50 mb-3" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">No users found</p>
            <p className="text-xs text-odizo-grey mt-1">Try refining your search query or add a new user.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5 text-odizo-grey font-medium text-xs uppercase">
                  <th className="py-3 px-4">Name & Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Work Mode</th>
                  <th className="py-3 px-4">Approved Activity</th>
                  <th className="py-3 px-4">Working Hours / Shift</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-black/10 dark:divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-black/5 dark:bg-white/3 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-xs text-odizo-grey font-normal">{user.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        user.role === 'Admin' 
                          ? 'bg-odizo-red/10 text-odizo-red border border-odizo-red/20' 
                          : user.role === 'Employee' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        user.workMode === 'Remote'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : user.workMode === 'Hybrid'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {user.workMode === 'Remote' ? '🏠 Remote' : user.workMode === 'Hybrid' ? '🔄 Hybrid' : '🏢 On-Site'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap items-center gap-1 text-xs font-semibold">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px]" title="Total Approved Leaves Taken">
                          🌴 {user.stats?.approvedLeaves || 0} Leaves
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px]" title="Total Approved WFH Days">
                          🏠 {user.stats?.approvedWfh || 0} WFH
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px]" title="Total Approved Shift Swaps">
                          🔄 {user.stats?.approvedSwaps || 0} Swaps
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-odizo-grey">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-odizo-red" />
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">{user.shift?.name || 'Standard Shift'}</span>
                          <span>{user.shift?.startTime} - {user.shift?.endTime}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                        user.status === 'Active' ? 'bg-green-500/15 text-green-400' : 'bg-black/5 dark:bg-white/5 text-odizo-grey'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-odizo-grey">
                      {new Date(user.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:bg-white/10 text-slate-900 dark:text-white rounded-lg border border-black/5 dark:border-white/5 hover:border-white/15 transition-all duration-300 cursor-pointer"
                          title="Edit User Profile & Stats"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="p-2 bg-odizo-red/5 hover:bg-odizo-red/15 text-odizo-red rounded-lg border border-odizo-red/10 hover:border-odizo-red/20 transition-all duration-300 cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Ultra-Clean Stable Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4 p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-900 dark:text-white">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-2xl bg-odizo-red/10 border border-odizo-red/20 text-odizo-red">
                  {modalMode === 'create' ? <Plus size={20} /> : <Edit size={20} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {modalMode === 'create' ? 'Create New User Profile' : 'Edit User Profile'}
                  </h2>
                  <p className="text-xs text-odizo-grey">
                    {modalMode === 'create' 
                      ? 'Add a new employee, intern or administrator to the organization' 
                      : `Update account credentials, shift timing and work mode for ${name || 'user'}`}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-odizo-grey hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
              {error && (
                <div className="flex items-center gap-2.5 bg-odizo-red/10 border border-odizo-red/25 rounded-2xl p-3.5 text-xs font-semibold text-odizo-red">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Edit Mode: Live Approved Stats */}
              {modalMode === 'edit' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-odizo-grey">
                      Approved Activity & Balances
                    </span>
                    <span className="text-[11px] text-odizo-grey font-medium">Real-time Ground Truth</span>
                  </div>
                  <EmployeeQuickStats 
                    leaveCount={selectedUserStats?.approvedLeaves || 0} 
                    wfhCount={selectedUserStats?.approvedWfh || 0} 
                    swapCount={selectedUserStats?.approvedSwaps || 0} 
                  />
                </div>
              )}

              <form id="user-profile-form" onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Basic Credentials Grid */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-odizo-grey">
                    Account Credentials
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Full Name <span className="text-odizo-red">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-odizo-red focus:bg-white dark:focus:bg-black/40 focus:outline-none transition-all"
                        />
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-odizo-grey" size={15} />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Email Address <span className="text-odizo-red">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. rahul@odizo.in"
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-odizo-red focus:bg-white dark:focus:bg-black/40 focus:outline-none transition-all"
                        />
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-odizo-grey" size={15} />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Password {modalMode === 'create' ? <span className="text-odizo-red">*</span> : ''}
                      </label>
                      {modalMode === 'edit' && (
                        <span className="text-[11px] text-odizo-grey">Leave blank to keep existing password</span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        required={modalMode === 'create'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={modalMode === 'create' ? 'Create a secure password' : 'Enter new password only if changing'}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-odizo-red focus:bg-white dark:focus:bg-black/40 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Role, Work Mode, Salary & Status */}
                <div className="space-y-4 pt-2 border-t border-black/5 dark:border-white/5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-odizo-grey">
                    Role & Policy Settings
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    {/* Role */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Role
                      </label>
                      <select
                        value={role}
                        onChange={(e) => handleRoleChange(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none cursor-pointer"
                      >
                        <option value="Employee" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Employee</option>
                        <option value="Intern" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Intern</option>
                        <option value="Admin" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">Admin</option>
                      </select>
                    </div>

                    {/* Work Mode */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Work Mode
                      </label>
                      <select
                        value={workMode}
                        onChange={(e) => setWorkMode(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none cursor-pointer"
                      >
                        <option value="On-Site" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🏢 On-Site</option>
                        <option value="Remote" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🏠 Remote</option>
                        <option value="Hybrid" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🔄 Hybrid</option>
                      </select>
                    </div>

                    {/* Base Salary */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Base Salary (₹)
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={baseSalary}
                        onChange={(e) => setBaseSalary(parseFloat(e.target.value) || 0)}
                        placeholder="65000"
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Account Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none cursor-pointer"
                      >
                        <option value="Active" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🟢 Active</option>
                        <option value="Inactive" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">🔴 Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Shift Settings Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-odizo-red" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Assigned Shift & Schedule
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-odizo-grey mb-1">Shift Name</label>
                      <input
                        type="text"
                        value={shiftName}
                        onChange={(e) => setShiftName(e.target.value)}
                        placeholder="e.g. Standard Shift"
                        className="w-full bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-odizo-grey mb-1">Start Time (24h)</label>
                      <input
                        type="text"
                        value={shiftStart}
                        onChange={(e) => setShiftStart(e.target.value)}
                        placeholder="09:00"
                        className="w-full bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-odizo-grey mb-1">End Time (24h)</label>
                      <input
                        type="text"
                        value={shiftEnd}
                        onChange={(e) => setShiftEnd(e.target.value)}
                        placeholder="18:00"
                        className="w-full bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="user-profile-form"
                className="flex items-center gap-2 px-6 py-2.5 bg-odizo-red text-white text-xs font-bold rounded-xl shadow-lg shadow-odizo-red/25 hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Check size={15} />
                <span>{modalMode === 'create' ? 'Create User Profile' : 'Save User Changes'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
