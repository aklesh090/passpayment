/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   Rangilo Raas 2026 — Authoritative Event Session Service ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * SINGLE SOURCE OF TRUTH for:
 *  - Which event day is currently active
 *  - Whether we are inside an active session window
 *  - Whether a given ticket is valid for the current session
 *
 * RULES:
 *  - Timezone: Asia/Kolkata (IST = UTC+5:30)
 *  - 9 event days: Oct 11–19 2026
 *  - Each session: 6:30 PM → 1:00 AM next calendar day
 *  - Midnight rule: 12 Oct 00:30 AM is STILL Day 1 (until 01:00 AM)
 *
 * IMPORTANT:
 *  - The frontend NEVER provides the event day — it is always resolved here.
 *  - resolveEventSession() accepts an optional `nowMs` for unit-testability.
 *    In production, pass no argument (uses real time).
 *
 * @module eventSession.service
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Event Schedule Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Event session definitions.
 * Each session is expressed as UTC milliseconds for timezone-safe arithmetic.
 *
 * Asia/Kolkata = UTC + 5:30 = UTC + 330 minutes
 *
 * Oct 11 2026 18:30 IST = Oct 11 2026 13:00 UTC
 * Oct 12 2026 01:00 IST = Oct 11 2026 19:30 UTC
 *
 * Formula for a given calendar date D:
 *   sessionStart = D 18:30 IST  = D 13:00 UTC
 *   sessionEnd   = (D+1) 01:00 IST = D 19:30 UTC
 */

/** IST offset in milliseconds (UTC+5:30) */
const IST_OFFSET_MS = 5 * 60 * 60 * 1000 + 30 * 60 * 1000; // 330 min

/**
 * Build a UTC timestamp for a given IST date/time.
 * @param {number} year
 * @param {number} month   1-indexed (October = 10)
 * @param {number} day
 * @param {number} hour    24h
 * @param {number} minute
 * @returns {number} UTC timestamp in ms
 */
function istToUtcMs(year, month, day, hour, minute) {
  // Construct UTC date for IST time by subtracting the IST offset
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MS;
  return utcMs;
}

/**
 * SESSION_SCHEDULE[i] represents event Day (i+1).
 * Index 0 = Day 1, Index 8 = Day 9.
 *
 * Each entry: { day, startUtcMs, endUtcMs }
 */
const SESSION_SCHEDULE = [
  // Day 1: 11 Oct 18:30 IST → 12 Oct 01:00 IST
  { day: 1, startUtcMs: istToUtcMs(2026, 10, 11, 18, 30), endUtcMs: istToUtcMs(2026, 10, 12,  1,  0) },
  // Day 2: 12 Oct 18:30 IST → 13 Oct 01:00 IST
  { day: 2, startUtcMs: istToUtcMs(2026, 10, 12, 18, 30), endUtcMs: istToUtcMs(2026, 10, 13,  1,  0) },
  // Day 3: 13 Oct 18:30 IST → 14 Oct 01:00 IST
  { day: 3, startUtcMs: istToUtcMs(2026, 10, 13, 18, 30), endUtcMs: istToUtcMs(2026, 10, 14,  1,  0) },
  // Day 4: 14 Oct 18:30 IST → 15 Oct 01:00 IST
  { day: 4, startUtcMs: istToUtcMs(2026, 10, 14, 18, 30), endUtcMs: istToUtcMs(2026, 10, 15,  1,  0) },
  // Day 5: 15 Oct 18:30 IST → 16 Oct 01:00 IST
  { day: 5, startUtcMs: istToUtcMs(2026, 10, 15, 18, 30), endUtcMs: istToUtcMs(2026, 10, 16,  1,  0) },
  // Day 6: 16 Oct 18:30 IST → 17 Oct 01:00 IST
  { day: 6, startUtcMs: istToUtcMs(2026, 10, 16, 18, 30), endUtcMs: istToUtcMs(2026, 10, 17,  1,  0) },
  // Day 7: 17 Oct 18:30 IST → 18 Oct 01:00 IST
  { day: 7, startUtcMs: istToUtcMs(2026, 10, 17, 18, 30), endUtcMs: istToUtcMs(2026, 10, 18,  1,  0) },
  // Day 8: 18 Oct 18:30 IST → 19 Oct 01:00 IST
  { day: 8, startUtcMs: istToUtcMs(2026, 10, 18, 18, 30), endUtcMs: istToUtcMs(2026, 10, 19,  1,  0) },
  // Day 9: 19 Oct 18:30 IST → 20 Oct 01:00 IST
  { day: 9, startUtcMs: istToUtcMs(2026, 10, 19, 18, 30), endUtcMs: istToUtcMs(2026, 10, 20,  1,  0) },
];

// ─────────────────────────────────────────────────────────────────────────────
// Core Resolution Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} EventSessionResult
 * @property {boolean} active       - true if we are currently in a live event session
 * @property {number|null} eventDay - 1–9 if active, null if not
 * @property {Date|null} sessionStart - ISO start time of the matched session
 * @property {Date|null} sessionEnd   - ISO end time of the matched session
 * @property {string} message       - Human-readable description
 */

/**
 * Resolve which event session is currently active.
 *
 * @param {number} [nowMs]  - Optional UTC timestamp override for testing.
 *                            In production, omit this — real Date.now() is used.
 * @returns {EventSessionResult}
 */
function resolveEventSession(nowMs) {
  const now = typeof nowMs === 'number' ? nowMs : Date.now();

  for (const session of SESSION_SCHEDULE) {
    if (now >= session.startUtcMs && now < session.endUtcMs) {
      return {
        active: true,
        eventDay: session.day,
        sessionStart: new Date(session.startUtcMs),
        sessionEnd: new Date(session.endUtcMs),
        message: `Event Day ${session.day} is currently active`,
      };
    }
  }

  return {
    active: false,
    eventDay: null,
    sessionStart: null,
    sessionEnd: null,
    message: 'No event session is currently active',
  };
}

/**
 * Check whether a specific event day number maps to the session
 * that is currently active.
 *
 * Always derives the answer from the authoritative schedule —
 * the frontend cannot override the event day.
 *
 * @param {number} [nowMs] - UTC timestamp override for testing
 * @returns {EventSessionResult}
 */
function getCurrentEventSession(nowMs) {
  return resolveEventSession(nowMs);
}

/**
 * Given the current server time, return the event session for a specific day.
 * Used to verify whether a daily-pass ticket's event day matches today.
 *
 * @param {number} dayNumber - 1–9
 * @returns {{ startUtcMs: number, endUtcMs: number } | null}
 */
function getSessionForDay(dayNumber) {
  return SESSION_SCHEDULE.find((s) => s.day === dayNumber);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  resolveEventSession,
  getCurrentEventSession,
  getSessionForDay,
  SESSION_SCHEDULE, // exported for tests
  istToUtcMs,       // exported for tests
};
