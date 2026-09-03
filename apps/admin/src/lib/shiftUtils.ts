/**
 * Utility functions for robust shift time parsing, normalization, and UTC timezone calculations.
 * Always handles 24h, 12h AM/PM, whitespace, and IST (+5:30) timezone offsets.
 */

// Parse any time string ("18:00", "06:00 PM", "6:00 pm", "9:00 AM", " 18:00:00 ") into { hour: 0-23, minute: 0-59 }
export function parseTimeTo24Hours(timeStr?: string | null): { hour: number; minute: number } {
  if (!timeStr || typeof timeStr !== 'string') {
    return { hour: 18, minute: 0 };
  }

  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');

  // Remove AM/PM and other non-time characters except digits and colon
  const rawTime = clean.replace(/[^\d:]/g, '');
  const parts = rawTime.split(':').map(p => parseInt(p, 10));

  let hour = isNaN(parts[0]) ? 0 : parts[0];
  let minute = parts.length > 1 && !isNaN(parts[1]) ? parts[1] : 0;

  if (isPM && hour < 12) {
    hour += 12;
  } else if (isAM && hour === 12) {
    hour = 0;
  }

  // Ensure bounds
  hour = Math.min(23, Math.max(0, hour));
  minute = Math.min(59, Math.max(0, minute));

  return { hour, minute };
}

// Normalize any time string to standard "HH:MM" 24-hour format
export function normalizeTimeToHHMM(timeStr?: string | null, defaultTime = "18:00"): string {
  if (!timeStr || typeof timeStr !== 'string') return defaultTime;
  const { hour, minute } = parseTimeTo24Hours(timeStr);
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// Helper to get local date string YYYY-MM-DD in IST timezone (UTC+5:30)
export function getLocalDateStringIST(date: Date = new Date()): string {
  const utcOffset = 5.5; // IST offset
  const localTime = new Date(date.getTime() + utcOffset * 3600000);
  return localTime.toISOString().split('T')[0];
}

// Calculate the exact UTC Date when a shift ends based on date string (YYYY-MM-DD) and shift times
export function calculateShiftEndTimeUTC(
  dateStr: string,
  startTimeStr?: string | null,
  endTimeStr?: string | null
): Date {
  const { hour: startHour } = parseTimeTo24Hours(startTimeStr || '09:00');
  const { hour: endHour, minute: endMin } = parseTimeTo24Hours(endTimeStr || '18:00');

  const [year, month, day] = dateStr.split('-').map(Number);

  // If shift end hour is less than start hour, it's an overnight shift (crosses midnight)
  let endDay = day;
  if (endHour < startHour) {
    endDay = day + 1;
  }

  // Date.UTC creates UTC time representing the local IST wall-clock time
  const localShiftEndTime = new Date(Date.UTC(year, month - 1, endDay, endHour, endMin, 0));
  // Subtract 5.5 hours to get true UTC timestamp
  return new Date(localShiftEndTime.getTime() - 5.5 * 3600000);
}

// Format minutes into clean human-readable duration (e.g. 510 -> "8h 30m", 3 -> "3m", 480 -> "8h")
export function formatMinutesToDuration(totalMins?: number | null, fallback = "8h"): string {
  if (totalMins === undefined || totalMins === null || isNaN(totalMins) || totalMins <= 0) {
    return fallback;
  }
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

