/**
 * Utility functions for user online status and activity resolution.
 */

/**
 * Parses a date string returned from the backend into a valid Date object.
 * Handles MySQL datetime strings (assumed to be Asia/Manila, UTC+8 as configured in backend)
 * as well as standard ISO strings (with Z or +/- timezone offset).
 */
export function parseServerDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // If date already includes timezone offset (+ or - after time) or Z
  if (trimmed.includes('Z') || /[+-]\d{2}(:\d{2})?$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // If it's a MySQL datetime string like "2026-09-03 22:26:16" or "2026-09-03T22:26:16"
  // The backend uses Asia/Manila (UTC+8). Appending '+08:00' ensures correct interpretation across all timezones.
  const normalized = trimmed.replace(' ', 'T') + '+08:00';
  const d = new Date(normalized);
  if (!isNaN(d.getTime())) return d;

  // Fallback to direct parsing
  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export interface FriendStatusInfo {
  isOnline: boolean;
  statusText: string;
  lastSeenText: string;
}

/**
 * Computes live online status, relative seen text, and detailed status description
 * for a friend in a circle.
 *
 * A user is considered online if their location or activity was updated within the last 5 minutes.
 */
export function getFriendOnlineStatus(friend: {
  updated_at?: string;
  waiting_status?: string | boolean | null;
  waiting_location?: string | null;
  ride_status?: string | null;
  boarded_bus_code?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}): FriendStatusInfo {
  let isOnline = false;
  let lastSeenText = 'Location unavailable';

  if (friend.updated_at) {
    const date = parseServerDate(friend.updated_at);
    if (date) {
      const now = Date.now();
      const diffMs = now - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHrs / 24);

      // Allow a small clock drift margin (-2 min) up to 5 min
      if (diffMin >= -2 && diffMin < 5) {
        isOnline = true;
        lastSeenText = 'Active now';
      } else if (diffMin >= 5 && diffMin < 60) {
        lastSeenText = `Last seen ${diffMin}m ago`;
      } else if (diffHrs >= 1 && diffHrs < 24) {
        lastSeenText = `Last seen ${diffHrs}h ago`;
      } else if (diffDays >= 1) {
        lastSeenText = `Last seen ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
      } else {
        lastSeenText = 'Offline';
      }
    }
  }

  let statusText = lastSeenText;
  if (isOnline) {
    const isWaiting = friend.waiting_status === 'waiting' || friend.waiting_status === true;
    const isBoarded = friend.ride_status === 'active' || friend.ride_status === 'ongoing';
    if (isWaiting) {
      statusText = `Waiting at ${friend.waiting_location || 'Stop'}`;
    } else if (isBoarded) {
      statusText = `Onboard Bus ${friend.boarded_bus_code || ''}`.trim();
    } else if (friend.latitude && friend.longitude) {
      statusText = 'Live location active';
    } else {
      statusText = 'Active now';
    }
  }

  return { isOnline, statusText, lastSeenText };
}
