'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, Save, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';

export default function Settings() {
  const [isWifiLockEnabled, setIsWifiLockEnabled] = useState(false);
  const [allowedWifiSSID, setAllowedWifiSSID] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch settings from the API
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/wifi');
      const data = await res.json();
      if (res.ok && data.config) {
        setIsWifiLockEnabled(data.config.isWifiLockEnabled);
        setAllowedWifiSSID(data.config.allowedWifiSSID || '');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load settings.' });
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
      setMessage({ type: 'error', text: 'Network error. Could not connect to API.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const res = await fetch('/api/settings/wifi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isWifiLockEnabled, allowedWifiSSID }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'System settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings.' });
      }
    } catch (e) {
      console.error('Error saving settings:', e);
      setMessage({ type: 'error', text: 'Network error. Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-odizo-grey to-slate-900 dark:from-white dark:via-odizo-grey dark:to-white bg-clip-text text-transparent">
          System Settings
        </h1>
        <p className="text-sm text-odizo-grey mt-1">
          Configure security, network verification rules, and global parameters for ODIZO.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-odizo-red border-t-transparent"></div>
          <p className="mt-4 text-sm text-odizo-grey">Loading settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {message && (
            <div
              className={`flex items-center gap-3 border rounded-2xl p-4 text-sm animate-fade-in ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-odizo-red/10 border-odizo-red/20 text-odizo-red'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 size={18} className="shrink-0" />
              ) : (
                <AlertTriangle size={18} className="shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Wi-Fi Settings Card */}
          <div className="glass-card p-6 floating-shadow border-black/5 dark:border-white/5 space-y-6">
            <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
              <div className="p-2 bg-odizo-red/10 border border-odizo-red/20 text-odizo-red rounded-lg">
                <Wifi size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Wi-Fi Connection Lock</h3>
                <p className="text-xs text-odizo-grey">Restrict where attendance punches can be submitted.</p>
              </div>
            </div>

            {/* Toggle switch */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-slate-900 dark:text-white">Enable Wi-Fi Lock</label>
                <p className="text-xs text-odizo-grey pr-8">
                  Forces the mobile application to verify the employee is connected to the office Wi-Fi network before letting them check in or out.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsWifiLockEnabled(!isWifiLockEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isWifiLockEnabled ? 'bg-odizo-red' : 'bg-black/5 dark:bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isWifiLockEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* SSID text input */}
            {isWifiLockEnabled && (
              <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5 animate-fade-in">
                <label className="block text-xs font-semibold uppercase tracking-wider text-odizo-grey">
                  Allowed Wi-Fi SSID (Network Name)
                </label>
                <input
                  type="text"
                  required
                  value={allowedWifiSSID}
                  onChange={(e) => setAllowedWifiSSID(e.target.value)}
                  placeholder="e.g., Office_Wifi_5G"
                  className="w-full bg-black/5 dark:bg-white/3 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none transition-colors"
                />
                <p className="text-[10px] text-odizo-grey">
                  Note: The SSID is case-sensitive. The mobile app must connect to exactly this network name.
                </p>
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="flex gap-3 bg-black/5 dark:bg-white/3 border border-black/5 dark:border-white/5 rounded-2xl p-4 text-xs text-odizo-grey">
            <Shield size={16} className="shrink-0 text-odizo-red" />
            <div className="space-y-1">
              <span className="font-semibold text-slate-900 dark:text-white">System Security Note</span>
              <p>
                When active, Wi-Fi checks are performed both client-side on the mobile device and server-side in the attendance verification endpoint.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-odizo-red text-slate-900 dark:text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-opacity-95 hover:shadow-[0_0_20px_rgba(225,97,103,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <Save size={16} />
              )}
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
