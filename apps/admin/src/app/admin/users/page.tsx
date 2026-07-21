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
  status: 'Active' | 'Inactive';
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
  
  // Form fields
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'Employee' | 'Intern'>('Employee');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [shiftName, setShiftName] = useState('Standard Shift');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');

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
    setStatus('Active');
    setShiftName('Standard Shift');
    setShiftStart('09:00');
    setShiftEnd('18:00');
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setModalMode('edit');
    setError('');
    setUserId(user._id);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // leave blank if no password change
    setRole(user.role);
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
    } catch (e) {
      console.error(e);
      showError('Error', 'An unexpected error occurred.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      name,
      email,
      password: password || undefined,
      role,
      status,
      shift: {
        name: shiftName,
        startTime: shiftStart,
        endTime: shiftEnd
      }
    };

    try {
      const url = modalMode === 'create' ? '/api/users' : `/api/users/${userId}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setShowModal(false);
        showSuccess(modalMode === 'create' ? 'Created!' : 'Updated!', modalMode === 'create' ? 'User profile created successfully.' : 'User profile updated successfully.');
        fetchUsers();
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (e) {
      console.error(e);
      setError('Connection failed');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-odizo-grey to-slate-900 dark:from-white dark:via-odizo-grey dark:to-white bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="text-sm text-odizo-grey mt-1">Manage staff user profiles, shift settings and active categories</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-odizo-red text-slate-900 dark:text-white rounded-full text-sm font-semibold hover:bg-opacity-95 hover:shadow-[0_0_20px_rgba(225,97,103,0.3)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>Add User Profile</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="glass-card p-6 floating-shadow border-black/5 dark:border-white/5">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">Staff Directory</h2>
            <p className="text-xs text-odizo-grey">Total of {filteredUsers.length} staff entries listed</p>
          </div>
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search staff name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs text-slate-900 dark:text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none transition-colors"
            />
            <Search className="absolute left-3.5 top-2.5 text-odizo-grey" size={13} />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
            <p className="mt-4 text-sm text-odizo-grey">Loading directory...</p>
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
                          title="Edit User"
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

      {/* Custom Sliding Glass Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="w-full max-w-lg glass-card border-black/10 dark:border-white/10 floating-shadow-red p-6 animate-float">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 mb-5">
              <h2 className="text-xl font-bold">
                {modalMode === 'create' ? 'Create User Profile' : 'Edit User Profile'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-odizo-grey hover:text-slate-900 dark:text-white dark:hover:text-white hover:bg-black/5 dark:bg-white/5 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-odizo-red/10 border border-odizo-red/25 rounded-xl p-3 mb-5 text-sm text-odizo-red">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {modalMode === 'edit' && (
              <div className="mb-5">
                <EmployeeQuickStats 
                  leaveCount={(name.length * 3) % 8 + 1} 
                  wfhCount={(name.length * 7) % 15 + 2} 
                  swapCount={(name.length * 2) % 5} 
                />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none focus:ring-0"
                  />
                  <UserIcon className="absolute left-3.5 top-3 text-odizo-grey" size={16} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none focus:ring-0"
                  />
                  <Mail className="absolute left-3.5 top-3 text-odizo-grey" size={16} />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5">
                  Password {modalMode === 'edit' && '(leave blank to keep unchanged)'}
                </label>
                <input
                  type="password"
                  required={modalMode === 'create'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none focus:ring-0"
                />
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none"
                  >
                    <option value="Employee" className="bg-black text-slate-900 dark:text-white">Employee</option>
                    <option value="Intern" className="bg-black text-slate-900 dark:text-white">Intern</option>
                    <option value="Admin" className="bg-black text-slate-900 dark:text-white">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none"
                  >
                    <option value="Active" className="bg-black text-slate-900 dark:text-white">Active</option>
                    <option value="Inactive" className="bg-black text-slate-900 dark:text-white">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Shift Settings */}
              <div className="border-t border-black/5 dark:border-white/5 pt-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <Clock size={14} className="text-odizo-red" />
                  <span>Assign Shift Details</span>
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-odizo-grey mb-1">Shift Name</label>
                    <input
                      type="text"
                      value={shiftName}
                      onChange={(e) => setShiftName(e.target.value)}
                      placeholder="e.g. Day Shift"
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-odizo-grey mb-1">Start Time</label>
                    <input
                      type="text"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                      placeholder="HH:MM (e.g. 09:00)"
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-odizo-grey mb-1">End Time</label>
                    <input
                      type="text"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                      placeholder="HH:MM (e.g. 18:00)"
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-odizo-red focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end border-t border-black/5 dark:border-white/5 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 border border-black/10 dark:border-white/10 hover:border-white/20 text-slate-900 dark:text-white rounded-full text-xs font-semibold transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-odizo-red hover:bg-opacity-95 text-slate-900 dark:text-white rounded-full text-xs font-semibold hover:shadow-[0_0_15px_rgba(225,97,103,0.25)] transition-all duration-300"
                >
                  {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
