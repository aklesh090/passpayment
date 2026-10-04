/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   Rangilo Raas 2026 — Event Session Unit Tests           ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Tests the authoritative event-session resolver WITHOUT any
 * real payments, real users, or real database connections.
 *
 * All date arithmetic is tested using deterministic UTC timestamps.
 *
 * Run: node server/tests/eventSession.test.js
 */

'use strict';

const {
  resolveEventSession,
  getSessionForDay,
  istToUtcMs,
  SESSION_SCHEDULE,
} = require('../src/services/eventSession.service');

// ─────────────────────────────────────────────────────────────────────────────
// Minimal test harness (no external deps)
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failures.push(label);
    failed++;
  }
}

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    console.log(`  ✓ ${label} (got: ${JSON.stringify(actual)})`);
    passed++;
  } else {
    console.error(`  ✗ ${label} — expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
    failures.push(`${label}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
    failed++;
  }
}

function describe(name, fn) {
  console.log(`\n▶ ${name}`);
  fn();
}

function summary() {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach((f) => console.log(`  • ${f}`));
    process.exitCode = 1;
  } else {
    console.log('\n✅ ALL TESTS PASSED — Event session resolver is correct.');
    process.exitCode = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: build UTC timestamps for specific IST moments
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a UTC timestamp for a given IST date/time.
 * Wraps istToUtcMs from the service itself so tests use the same conversion.
 */
function ist(year, month, day, hour, minute) {
  return istToUtcMs(year, month, day, hour, minute);
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION SCHEDULE SANITY
// ─────────────────────────────────────────────────────────────────────────────

describe('SESSION_SCHEDULE structure', () => {
  assertEqual(SESSION_SCHEDULE.length, 9, 'Exactly 9 event sessions defined');
  assertEqual(SESSION_SCHEDULE[0].day, 1, 'First session is Day 1');
  assertEqual(SESSION_SCHEDULE[8].day, 9, 'Last session is Day 9');

  SESSION_SCHEDULE.forEach((s, i) => {
    assert(s.endUtcMs > s.startUtcMs, `Day ${s.day}: end is after start`);
    // Each session should be 6.5 hours (6h30m start to 1AM = 6.5h)
    const durationMs = s.endUtcMs - s.startUtcMs;
    const durationHours = durationMs / (60 * 60 * 1000);
    assertEqual(durationHours, 6.5, `Day ${s.day}: session duration is exactly 6.5 hours`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DAY 1 BOUNDARY TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Day 1: 11 Oct 2026 6:30 PM IST → 12 Oct 2026 1:00 AM IST', () => {

  // Exactly at session start
  const day1Start = ist(2026, 10, 11, 18, 30);
  let res = resolveEventSession(day1Start);
  assert(res.active === true, 'At exactly 6:30 PM IST on Oct 11 → session is ACTIVE');
  assertEqual(res.eventDay, 1, 'At 6:30 PM IST on Oct 11 → Day 1');

  // Mid-session (10 PM)
  const day1Mid = ist(2026, 10, 11, 22, 0);
  res = resolveEventSession(day1Mid);
  assert(res.active === true, 'At 10 PM IST on Oct 11 → session is ACTIVE');
  assertEqual(res.eventDay, 1, 'At 10 PM IST on Oct 11 → Day 1');

  // Midnight rule: Oct 12 12:30 AM = still Day 1
  const day1Midnight = ist(2026, 10, 12, 0, 30);
  res = resolveEventSession(day1Midnight);
  assert(res.active === true, 'Oct 12 12:30 AM IST → still ACTIVE (midnight rule)');
  assertEqual(res.eventDay, 1, 'Oct 12 12:30 AM IST → still Day 1 (midnight rule)');

  // 1 minute before end → still Day 1
  const day1NearEnd = ist(2026, 10, 12, 0, 59);
  res = resolveEventSession(day1NearEnd);
  assert(res.active === true, 'Oct 12 00:59 AM IST → still ACTIVE');
  assertEqual(res.eventDay, 1, 'Oct 12 00:59 AM IST → still Day 1');

  // Exactly at end → session over
  const day1End = ist(2026, 10, 12, 1, 0);
  res = resolveEventSession(day1End);
  assert(res.active === false, 'Exactly at Oct 12 1:00 AM IST → session ENDED');
  assertEqual(res.eventDay, null, 'At end boundary → no event day');

  // 1 min before start → not started
  const beforeDay1 = ist(2026, 10, 11, 18, 29);
  res = resolveEventSession(beforeDay1);
  assert(res.active === false, 'Oct 11 6:29 PM IST → session NOT YET STARTED');
  assertEqual(res.eventDay, null, 'Before 6:30 PM → no event day');
});

// ─────────────────────────────────────────────────────────────────────────────
// DAY 2 BOUNDARY TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Day 2: 12 Oct 2026 6:30 PM IST → 13 Oct 2026 1:00 AM IST', () => {

  // Gap between Day 1 end (1AM) and Day 2 start (6:30PM) = no active session
  const gapMorning = ist(2026, 10, 12, 10, 0); // 10 AM Oct 12
  let res = resolveEventSession(gapMorning);
  assert(res.active === false, 'Oct 12 10:00 AM IST → no session active (between days)');
  assertEqual(res.eventDay, null, 'Oct 12 10:00 AM → no event day');

  // 1 min before Day 2 start
  const beforeDay2 = ist(2026, 10, 12, 18, 29);
  res = resolveEventSession(beforeDay2);
  assert(res.active === false, 'Oct 12 6:29 PM IST → Day 2 NOT YET STARTED');
  assertEqual(res.eventDay, null, 'Oct 12 6:29 PM → no event day');

  // Exactly at Day 2 start
  const day2Start = ist(2026, 10, 12, 18, 30);
  res = resolveEventSession(day2Start);
  assert(res.active === true, 'Oct 12 6:30 PM IST → Day 2 STARTED');
  assertEqual(res.eventDay, 2, 'Oct 12 6:30 PM → Day 2');

  // Day 2 midnight (still Day 2)
  const day2Midnight = ist(2026, 10, 13, 0, 30);
  res = resolveEventSession(day2Midnight);
  assert(res.active === true, 'Oct 13 12:30 AM IST → still Day 2 (midnight rule)');
  assertEqual(res.eventDay, 2, 'Oct 13 12:30 AM → Day 2');

  // Day 2 end
  const day2End = ist(2026, 10, 13, 1, 0);
  res = resolveEventSession(day2End);
  assert(res.active === false, 'Oct 13 1:00 AM IST → Day 2 ENDED');
});

// ─────────────────────────────────────────────────────────────────────────────
// DAY 9 BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────

describe('Day 9: 19 Oct 2026 6:30 PM IST → 20 Oct 2026 1:00 AM IST', () => {

  const day9Start = ist(2026, 10, 19, 18, 30);
  let res = resolveEventSession(day9Start);
  assert(res.active === true, 'Oct 19 6:30 PM IST → Day 9 ACTIVE');
  assertEqual(res.eventDay, 9, 'Oct 19 6:30 PM → Day 9');

  // After all events end
  const afterEvent = ist(2026, 10, 20, 1, 0);
  res = resolveEventSession(afterEvent);
  assert(res.active === false, 'Oct 20 1:00 AM IST → ALL SESSIONS ENDED');
  assertEqual(res.eventDay, null, 'After all events → no event day');

  // Way before
  const beforeEvent = ist(2026, 10, 11, 0, 0);
  res = resolveEventSession(beforeEvent);
  assert(res.active === false, 'Oct 11 midnight IST → event not started');
});

// ─────────────────────────────────────────────────────────────────────────────
// ALL 9 DAYS: spot check
// ─────────────────────────────────────────────────────────────────────────────

describe('Spot check: each day is active during its session', () => {
  const dayDates = [11, 12, 13, 14, 15, 16, 17, 18, 19];
  dayDates.forEach((date, i) => {
    const expectedDay = i + 1;
    const midSession = ist(2026, 10, date, 21, 0); // 9 PM IST
    const res = resolveEventSession(midSession);
    assert(res.active === true, `Oct ${date} 9PM → session ACTIVE`);
    assertEqual(res.eventDay, expectedDay, `Oct ${date} 9PM → Day ${expectedDay}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DAILY PASS VALIDATION LOGIC
// (pure logic test — no DB, no real tickets)
// ─────────────────────────────────────────────────────────────────────────────

describe('Daily pass logic: Day 2 ticket', () => {
  const day2Ticket_validDays = [2];

  // During Day 1 → should fail (wrong day)
  const day1Active = ist(2026, 10, 11, 20, 0);
  let session = resolveEventSession(day1Active);
  assert(session.active, 'Day 1 session is active for the test');
  assert(
    !day2Ticket_validDays.includes(session.eventDay),
    'Day 2 ticket: NOT valid during Day 1'
  );

  // During Day 2 → should pass
  const day2Active = ist(2026, 10, 12, 20, 0);
  session = resolveEventSession(day2Active);
  assert(session.active, 'Day 2 session is active for the test');
  assert(
    day2Ticket_validDays.includes(session.eventDay),
    'Day 2 ticket: VALID during Day 2'
  );

  // During Day 3 → should fail
  const day3Active = ist(2026, 10, 13, 20, 0);
  session = resolveEventSession(day3Active);
  assert(session.active, 'Day 3 session is active for the test');
  assert(
    !day2Ticket_validDays.includes(session.eventDay),
    'Day 2 ticket: NOT valid during Day 3'
  );
});

describe('Daily pass logic: Day 5 ticket', () => {
  const day5Ticket_validDays = [5];

  // Day 4 → fail
  const day4Active = ist(2026, 10, 14, 20, 0);
  let session = resolveEventSession(day4Active);
  assert(!day5Ticket_validDays.includes(session.eventDay), 'Day 5 ticket: NOT valid during Day 4');

  // Day 5 → pass
  const day5Active = ist(2026, 10, 15, 20, 0);
  session = resolveEventSession(day5Active);
  assert(day5Ticket_validDays.includes(session.eventDay), 'Day 5 ticket: VALID during Day 5');

  // Day 6 → fail
  const day6Active = ist(2026, 10, 16, 20, 0);
  session = resolveEventSession(day6Active);
  assert(!day5Ticket_validDays.includes(session.eventDay), 'Day 5 ticket: NOT valid during Day 6');
});

// ─────────────────────────────────────────────────────────────────────────────
// SEASON PASS VALIDATION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

describe('VIP/GA Season pass logic: valid on all 9 days', () => {
  const seasonPass_validDays = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const testDates = [11, 12, 13, 14, 15, 16, 17, 18, 19];

  testDates.forEach((date, i) => {
    const expectedDay = i + 1;
    const midSession = ist(2026, 10, date, 21, 0);
    const session = resolveEventSession(midSession);
    assert(
      seasonPass_validDays.includes(session.eventDay),
      `Season pass: VALID on Day ${expectedDay} (Oct ${date})`
    );
  });
});

describe('Season pass: outside event hours → EVENT_NOT_ACTIVE', () => {
  const beforeEvent = ist(2026, 10, 11, 17, 0); // before Day 1
  const session = resolveEventSession(beforeEvent);
  assert(!session.active, 'Before any event → no active session');
  assertEqual(session.eventDay, null, 'No eventDay before event');

  const afterEvent = ist(2026, 10, 20, 2, 0); // after Day 9
  const session2 = resolveEventSession(afterEvent);
  assert(!session2.active, 'After all events → no active session');
});

// ─────────────────────────────────────────────────────────────────────────────
// getSessionForDay helper
// ─────────────────────────────────────────────────────────────────────────────

describe('getSessionForDay helper', () => {
  for (let d = 1; d <= 9; d++) {
    const s = getSessionForDay(d);
    assert(s !== null, `getSessionForDay(${d}) returns a session`);
    assertEqual(s.day, d, `getSessionForDay(${d}).day === ${d}`);
  }
  const invalid = getSessionForDay(0);
  assertEqual(invalid, undefined, 'getSessionForDay(0) returns undefined');
  const invalid2 = getSessionForDay(10);
  assertEqual(invalid2, undefined, 'getSessionForDay(10) returns undefined');
});

// ─────────────────────────────────────────────────────────────────────────────
// EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  // 1 ms before Day 1
  const oneBeforeDay1 = ist(2026, 10, 11, 18, 30) - 1;
  let res = resolveEventSession(oneBeforeDay1);
  assert(!res.active, '1ms before Day 1 start → not active');

  // 1 ms after Day 1 end
  const oneAfterDay1End = ist(2026, 10, 12, 1, 0) + 1;
  res = resolveEventSession(oneAfterDay1End);
  assert(!res.active, '1ms after Day 1 end → not active');

  // Between sessions: Oct 12 3:00 AM IST (after Day 1 ends, before Day 2)
  const between = ist(2026, 10, 12, 3, 0);
  res = resolveEventSession(between);
  assert(!res.active, 'Oct 12 3:00 AM IST → between sessions, not active');
  assertEqual(res.eventDay, null, 'Between sessions → no eventDay');
});

// ─────────────────────────────────────────────────────────────────────────────
// PRINT SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

summary();
