'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, MapPin, Save, AlertTriangle, CheckCircle2, Shield, Crosshair } from 'lucide-react';

export default function Settings() {
  const [isWifiLockEnabled, setIsWifiLockEnabled] = useState(false);
  const [allowedWifiSSID, setAllowedWifiSSID] = useState('');
  const [isGeofenceEnabled, setIsGeofenceEnabled] = useState(true);
  const [officeLatitude, setOfficeLatitude] = useState<number | string>(12.9716);
  const [officeLongitude, setOfficeLongitude] = useState<number | string>(77.5946);
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState<number | string>(100);
  const [gettingLocation, setGettingLocation] = useState(false);
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
        setIsGeofenceEnabled(data.config.isGeofenceEnabled ?? true);
        setOfficeLatitude(data.config.officeLatitude ?? 12.9716);
        setOfficeLongitude(data.config.officeLongitude ?? 77.5946);
        setGeofenceRadiusMeters(data.config.geofenceRadiusMeters ?? 100);
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

  // Use browser geolocation to fill in office coordinates
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOfficeLatitude(parseFloat(position.coords.latitude.toFixed(6)));
        setOfficeLongitude(parseFloat(position.coords.longitude.toFixed(6)));
        setGettingLocation(false);
        setMessage({ type: 'success', text: 'Office GPS coordinates captured from your current location!' });
      },
      (error) => {
        setGettingLocation(false);
        setMessage({ type: 'error', text: `Failed to get GPS location: ${error.message}` });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Save settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const res = await fetch('/api/settings/wifi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isWifiLockEnabled, 
          allowedWifiSSID,
          isGeofenceEnabled,
          officeLatitude: Number(officeLatitude),
          officeLongitude: Number(officeLongitude),
          geofenceRadiusMeters: Number(geofenceRadiusMeters)
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'ODIZO system security settings saved successfully!' });
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
          Configure geofencing, network security, and attendance verification parameters for ODIZO.
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

          {/* Strict Geofence Lock Card */}
          <div className="glass-card p-6 floating-shadow border-black/5 dark:border-white/5 space-y-6">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-odizo-red/10 border border-odizo-red/20 text-odizo-red rounded-lg">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">GPS Geofence Lock & WFH Verification</h3>
                  <p className="text-xs text-odizo-grey">Strictly block out-of-range punches without approved WFH status.</p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => setIsGeofenceEnabled(!isGeofenceEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isGeofenceEnabled ? 'bg-odizo-red' : 'bg-black/5 dark:bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isGeofenceEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {isGeofenceEnabled && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-odizo-grey">Office Coordinates</span>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={gettingLocation}
                    className="flex items-center gap-1.5 text-xs text-odizo-red hover:underline font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Crosshair size={14} className={gettingLocation ? "animate-spin" : ""} />
                    <span>{gettingLocation ? "Fetching GPS..." : "Set to My Current Location"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 dark:text-slate-300 font-medium">Office Latitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={officeLatitude}
                      onChange={(e) => setOfficeLatitude(e.target.value)}
                      placeholder="e.g. 12.9716"
                      className="w-full bg-black/5 dark:bg-white/3 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs text-slate-700 dark:text-slate-300 font-medium">Office Longitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={officeLongitude}
                      onChange={(e) => setOfficeLongitude(e.target.value)}
                      placeholder="e.g. 77.5946"
                      className="w-full bg-black/5 dark:bg-white/3 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Allowed Geofence Radius (Meters)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="10000"
                    required
                    value={geofenceRadiusMeters}
                    onChange={(e) => setGeofenceRadiusMeters(e.target.value)}
                    placeholder="100"
                    className="w-full bg-black/5 dark:bg-white/3 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-odizo-grey focus:border-odizo-red focus:outline-none transition-colors"
                  />
                  <p className="text-[11px] text-odizo-grey">
                    Employees punching outside this perimeter will be blocked with a 403 Forbidden error unless they have an approved WFH request for today.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Wi-Fi Settings Card */}
          <div className="glass-card p-6 floating-shadow border-black/5 dark:border-white/5 space-y-6">
            <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-4">
              <div className="p-2 bg-odizo-red/10 border border-odizo-red/20 text-odizo-red rounded-lg">
                <Wifi size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Wi-Fi Connection Lock</h3>
                <p className="text-xs text-odizo-grey">Require connection to the office Wi-Fi network.</p>
              </div>
            </div>

            {/* Toggle switch */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-slate-900 dark:text-white">Enable Wi-Fi Lock</label>
                <p className="text-xs text-odizo-grey pr-8">
                  Forces the mobile application to verify connection to the office Wi-Fi SSID before permitting attendance punches.
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
              <span className="font-semibold text-slate-900 dark:text-white">ODIZO Security Enforcement</span>
              <p>
                Geofence and Wi-Fi validation are executed server-side on every punch request. Employees with an approved Work From Home (WFH) request for the day bypass perimeter restrictions automatically.
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
