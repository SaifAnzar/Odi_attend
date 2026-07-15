'use client';

import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Info, AlertTriangle, Calendar, Users, Eye, X, CheckCircle2, Trash2 } from 'lucide-react';
import { showError, showSuccess, showConfirm } from '@/lib/swal';

interface UserAck {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Notice {
  _id: string;
  title: string;
  content: string;
  type: 'Info' | 'Warning' | 'Holiday';
  acknowledgedBy: UserAck[];
  createdAt: string;
}

export default function NoticeBoardAdminPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'Info' | 'Warning' | 'Holiday'>('Info');

  // Reader list modal states
  const [showAckModal, setShowAckModal] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notices');
      const data = await res.json();
      if (res.ok && data.notices) {
        setNotices(data.notices);
      } else {
        showError('Error', data.error || 'Failed to load notices.');
      }
    } catch (e) {
      console.error(e);
      showError('Error', 'Network error. Could not connect to API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showError('Required', 'Please enter a title and content for the notice.');
      return;
    }

    try {
      setPublishing(true);
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, type })
      });
      const data = await res.json();

      if (res.ok) {
        showSuccess('Broadcast Sent!', 'Notice has been published to all mobile dashboards.');
        setTitle('');
        setContent('');
        setType('Info');
        fetchNotices();
      } else {
        showError('Publish Failed', data.error || 'Failed to send broadcast.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred.');
    } finally {
      setPublishing(false);
    }
  };

  const handleViewAcks = (notice: Notice) => {
    setSelectedNotice(notice);
    setShowAckModal(true);
  };

  const handleDeleteNotice = async (noticeId: string) => {
    const confirmed = await showConfirm(
      'Delete Announcement',
      'Are you sure you want to delete this notice? This action is permanent and it will be removed from all employee feeds.'
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/notices/${noticeId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess('Deleted!', 'Announcement deleted successfully.');
        fetchNotices();
      } else {
        showError('Delete Failed', data.error || 'Failed to delete announcement.');
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
      {/* Col 1: Form */}
      <div className="lg:col-span-1 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-odizo-grey to-white bg-clip-text text-transparent">
            Notice Board
          </h1>
          <p className="text-sm text-odizo-grey mt-1">Publish alerts and announcements</p>
        </div>

        <form onSubmit={handlePublish} className="glass-card p-6 floating-shadow border-white/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Megaphone size={16} className="text-odizo-red" />
            <h3 className="font-bold text-white">Broadcast Announcement</h3>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey">Notice Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Office Closed (Holiday)"
              className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey">Alert Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-odizo-red focus:outline-none"
            >
              <option value="Info" className="bg-black text-white">Info (Blue alert)</option>
              <option value="Warning" className="bg-black text-white">Warning (Red alert)</option>
              <option value="Holiday" className="bg-black text-white">Holiday (Green alert)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey">Announcement Details</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type message content here..."
              className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={publishing}
            className="w-full flex items-center justify-center gap-2 py-3 bg-odizo-red hover:bg-odizo-red/80 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-red-900/25"
          >
            {publishing ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <Send size={16} />
                <span>Send Broadcast</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Col 2 & 3: Board Feed */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>Active Broadcast History</span>
          <span className="text-xs font-normal text-odizo-grey bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5">
            {notices.length} Total
          </span>
        </h2>

        {loading ? (
          <div className="glass-card p-20 flex flex-col items-center justify-center border-white/5">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
            <p className="mt-4 text-sm text-odizo-grey">Refreshing notices...</p>
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
            <Megaphone size={40} className="mx-auto text-odizo-grey/40 mb-3" />
            <p className="text-sm font-semibold text-white">No active notices broadcasted</p>
            <p className="text-xs text-odizo-grey mt-1">Use the panel on the left to issue notice alerts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {notices.map((notice) => (
              <div
                key={notice._id}
                className={`glass-card p-5 border transition-all ${
                  notice.type === 'Warning'
                    ? 'border-odizo-red/25 bg-gradient-to-br from-odizo-red/3 to-transparent shadow-[0_0_20px_rgba(225,97,103,0.02)]'
                    : notice.type === 'Holiday'
                      ? 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/3 to-transparent'
                      : 'border-white/5 bg-white/1'
                }`}
              >
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        notice.type === 'Warning'
                          ? 'bg-odizo-red/10 border-odizo-red/20 text-odizo-red'
                          : notice.type === 'Holiday'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                      }`}
                    >
                      {notice.type}
                    </span>
                    <span className="text-[10px] text-odizo-grey flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(notice.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewAcks(notice)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-odizo-grey hover:text-white transition-colors cursor-pointer"
                    >
                      <Users size={12} />
                      <span>{notice.acknowledgedBy.length} Acknowledged</span>
                      <Eye size={10} style={{ marginLeft: 2 }} />
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDeleteNotice(notice._id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-odizo-red/10 hover:bg-odizo-red/20 border border-odizo-red/20 hover:border-odizo-red/40 rounded-lg text-[10px] text-odizo-red transition-all cursor-pointer disabled:opacity-50 animate-fade-in"
                      title="Delete Announcement"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-white text-base mb-2">{notice.title}</h3>
                <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{notice.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reader Acknowledgements Modal */}
      {showAckModal && selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-card p-6 floating-shadow border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Users size={18} className="text-odizo-red" />
                <span>Notice Read Receipts</span>
              </div>
              <button 
                onClick={() => setShowAckModal(false)}
                className="text-odizo-grey hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-odizo-grey">Notice Title</h4>
              <p className="text-sm font-semibold text-white">{selectedNotice.title}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-odizo-grey">Read Receipts List</h4>
              <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 pr-1 space-y-2">
                {selectedNotice.acknowledgedBy.length === 0 ? (
                  <p className="text-xs text-odizo-grey py-4 text-center">No employee has acknowledged this notice yet.</p>
                ) : (
                  selectedNotice.acknowledgedBy.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 bg-white/3 border border-white/5 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate text-white">{user.name}</p>
                        <p className="text-[10px] text-odizo-grey truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 size={12} />
                        <span>Read</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAckModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold border border-white/10 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
