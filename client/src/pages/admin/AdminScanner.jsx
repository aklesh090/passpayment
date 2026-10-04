/**
 * AdminScanner.jsx
 *
 * Gate-entry QR scanner for Rangilo Raas 2026.
 *
 * Features:
 *  - Live camera QR scanning via html5-qrcode (rear/environment camera preferred)
 *  - Manual ticket ID fallback input
 *  - Server-authoritative event day displayed (never trusted from frontend)
 *  - Rich result display matching all 7 result codes from ticketValidation.service
 *  - ALLOW ENTRY button only for VALID_PASS results (records admission)
 *  - Race-condition safe (duplicate scan returns ALREADY_USED_TODAY from server)
 *
 * Result codes handled:
 *   VALID_PASS | ALREADY_USED_TODAY | PASS_NOT_VALID_TODAY |
 *   EVENT_NOT_ACTIVE | TICKET_NOT_FOUND | CANCELLED_PASS | PAYMENT_NOT_VERIFIED
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import adminService from '../../services/admin.service';
import {
  CheckCircle, XCircle, AlertCircle, Camera, CameraOff,
  KeyboardIcon, RefreshCw, Clock, Ticket, User, Calendar,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const QR_REGION_ID = 'rr-qr-reader';

const RESULT_CONFIG = {
  VALID_PASS: {
    color: 'green',
    icon: CheckCircle,
    title: '✓ VALID PASS',
    border: 'border-green-500/40',
    bg: 'bg-green-900/20',
    titleClass: 'text-green-400',
  },
  ALREADY_USED_TODAY: {
    color: 'orange',
    icon: AlertCircle,
    title: '⚠ ALREADY USED TODAY',
    border: 'border-orange-500/40',
    bg: 'bg-orange-900/20',
    titleClass: 'text-orange-400',
  },
  PASS_NOT_VALID_TODAY: {
    color: 'red',
    icon: XCircle,
    title: '✕ PASS NOT VALID TODAY',
    border: 'border-red-500/40',
    bg: 'bg-red-900/20',
    titleClass: 'text-red-400',
  },
  EVENT_NOT_ACTIVE: {
    color: 'zinc',
    icon: Clock,
    title: 'EVENT NOT CURRENTLY ACTIVE',
    border: 'border-zinc-500/40',
    bg: 'bg-zinc-800/40',
    titleClass: 'text-zinc-300',
  },
  TICKET_NOT_FOUND: {
    color: 'red',
    icon: XCircle,
    title: 'TICKET NOT FOUND',
    border: 'border-red-500/40',
    bg: 'bg-red-900/20',
    titleClass: 'text-red-400',
  },
  CANCELLED_PASS: {
    color: 'red',
    icon: XCircle,
    title: '✕ CANCELLED PASS',
    border: 'border-red-500/40',
    bg: 'bg-red-900/20',
    titleClass: 'text-red-400',
  },
  PAYMENT_NOT_VERIFIED: {
    color: 'red',
    icon: XCircle,
    title: '✕ PAYMENT NOT VERIFIED',
    border: 'border-red-500/40',
    bg: 'bg-red-900/20',
    titleClass: 'text-red-400',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Result Panel
// ─────────────────────────────────────────────────────────────────────────────

function ResultPanel({ result, onReset }) {
  if (!result) return null;

  // Map legacy `reason`-based results (in case of unexpected shape) to result codes
  const code = result.result || _inferResultCode(result);
  const cfg = RESULT_CONFIG[code] || RESULT_CONFIG.TICKET_NOT_FOUND;
  const Icon = cfg.icon;
  const ticket = result.ticket;

  return (
    <div className={`rounded-xl p-6 border ${cfg.border} ${cfg.bg} mb-6`}>
      <div className="text-center mb-4">
        <Icon className={`w-14 h-14 mx-auto mb-3 text-${cfg.color}-400`} />
        <h2 className={`text-2xl font-bold mb-1 ${cfg.titleClass}`}>{cfg.title}</h2>
        <p className="text-zinc-400 text-sm">{result.message || result.reason}</p>
      </div>

      {ticket && (
        <div className="bg-zinc-950/80 rounded-lg p-4 mt-4 space-y-3 border border-zinc-800">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-500"><User className="w-4 h-4" /> Customer</span>
            <span className="font-semibold text-white">{ticket.holderName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-500"><Ticket className="w-4 h-4" /> Pass</span>
            <span className="font-semibold text-white">{ticket.passName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-500"><Calendar className="w-4 h-4" /> Ticket ID</span>
            <span className="font-mono text-xs text-zinc-300">{ticket.ticketId}</span>
          </div>
          {result.eventDay && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-500"><Calendar className="w-4 h-4" /> Today's Event</span>
              <span className="font-semibold text-white">Day {result.eventDay}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-500"><CheckCircle className="w-4 h-4" /> Entry</span>
            <span className={`font-bold ${code === 'VALID_PASS' ? 'text-green-400' : 'text-red-400'}`}>
              {code === 'VALID_PASS' ? 'VALID' : 'DENIED'}
            </span>
          </div>
        </div>
      )}

      {code === 'VALID_PASS' && (
        <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
          <p className="text-green-300 font-bold text-lg">✓ ALLOW ENTRY</p>
          <p className="text-green-500/70 text-xs mt-1">Admission recorded for Day {result.eventDay}</p>
        </div>
      )}

      <button
        onClick={onReset}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 font-medium transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Scan Next Ticket
      </button>
    </div>
  );
}

// Fallback result code inference for backward compat
function _inferResultCode(result) {
  if (result.valid) return 'VALID_PASS';
  const reason = (result.reason || '').toUpperCase();
  if (reason.includes('ALREADY')) return 'ALREADY_USED_TODAY';
  if (reason.includes('NOT VALID') || reason.includes('NOT VALID TODAY')) return 'PASS_NOT_VALID_TODAY';
  if (reason.includes('EVENT NOT') || reason.includes('NOT ACTIVE')) return 'EVENT_NOT_ACTIVE';
  if (reason.includes('CANCELLED')) return 'CANCELLED_PASS';
  if (reason.includes('PAYMENT')) return 'PAYMENT_NOT_VERIFIED';
  return 'TICKET_NOT_FOUND';
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Session Banner
// ─────────────────────────────────────────────────────────────────────────────

function SessionBanner({ session }) {
  if (!session) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 text-sm bg-zinc-900 rounded-lg px-4 py-2 mb-6 border border-zinc-800">
        <Clock className="w-4 h-4" />
        <span>Loading event session...</span>
      </div>
    );
  }

  if (!session.active) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 text-sm bg-zinc-900 rounded-lg px-4 py-2 mb-6 border border-zinc-700">
        <Clock className="w-4 h-4 text-zinc-500" />
        <span>{session.message}</span>
        <span className="ml-auto text-xs text-zinc-600">Sessions: 6:30 PM – 1:00 AM IST</span>
      </div>
    );
  }

  const start = session.sessionStart ? new Date(session.sessionStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '';
  const end = session.sessionEnd ? new Date(session.sessionEnd).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '';

  return (
    <div className="flex items-center gap-3 bg-green-900/20 border border-green-500/30 rounded-lg px-4 py-2.5 mb-6">
      <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
      <div className="flex-1">
        <span className="text-green-300 font-bold text-sm">LIVE — Event Day {session.eventDay}</span>
        <span className="text-green-500/70 text-xs ml-2">Session: {start} – {end} IST</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Scanner Component
// ─────────────────────────────────────────────────────────────────────────────

const AdminScanner = () => {
  // ── State ──
  const [mode, setMode] = useState('camera'); // 'camera' | 'manual'
  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'starting' | 'scanning' | 'paused' | 'error'
  const [cameraError, setCameraError] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [session, setSession] = useState(null);

  const html5QrRef = useRef(null);
  const scanLockRef = useRef(false); // prevents double-fire on same QR frame
  const manualInputRef = useRef(null);

  // ── Load server event session on mount ──
  useEffect(() => {
    adminService.getEventSession()
      .then((payload) => setSession(payload.session))
      .catch(() => setSession({ active: false, message: 'Could not load event session' }));
  }, []);

  // ── Stop camera on unmount ──
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start camera when mode switches to 'camera' and no result shown ──
  useEffect(() => {
    if (mode === 'camera' && !result) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Camera Management
  // ─────────────────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    if (html5QrRef.current) return; // already running
    setCameraState('starting');
    setCameraError(null);

    const qr = new Html5Qrcode(QR_REGION_ID);
    html5QrRef.current = qr;
    scanLockRef.current = false;

    try {
      await qr.start(
        { facingMode: 'environment' }, // prefer rear camera on mobile
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => onQrDecoded(decodedText),
        (errorMsg) => {
          // Scan frame errors are expected when no QR in view — ignore
          void errorMsg;
        }
      );
      setCameraState('scanning');
    } catch (err) {
      html5QrRef.current = null;
      setCameraState('error');
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings, then reload.');
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
        setCameraError('No camera found on this device. Use manual entry below.');
      } else {
        setCameraError(`Camera error: ${msg}`);
      }
    }
  }, []);

  const stopCamera = useCallback(async () => {
    if (!html5QrRef.current) return;
    try {
      const state = html5QrRef.current.getState();
      // State 2 = SCANNING, State 1 = PAUSED
      if (state === 2 || state === 1) {
        await html5QrRef.current.stop();
      }
    } catch (_) {
      // ignore stop errors
    }
    html5QrRef.current = null;
    setCameraState('idle');
  }, []);

  const resumeCamera = useCallback(async () => {
    setResult(null);
    scanLockRef.current = false;
    await stopCamera();
    // Small delay so DOM clears
    setTimeout(() => startCamera(), 150);
  }, [startCamera, stopCamera]);

  // ─────────────────────────────────────────────────────────────────────────
  // QR Decode Handler
  // ─────────────────────────────────────────────────────────────────────────

  const onQrDecoded = useCallback(async (decodedText) => {
    if (scanLockRef.current) return; // already processing a scan
    scanLockRef.current = true;

    // Pause camera while we process
    setCameraState('paused');
    try {
      if (html5QrRef.current) {
        await html5QrRef.current.pause(true);
      }
    } catch (_) { /* ignore */ }

    await submitToken(decodedText.trim());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // Validation Submission (shared by camera + manual)
  // ─────────────────────────────────────────────────────────────────────────

  const submitToken = async (token) => {
    if (!token) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await adminService.verifyTicket(token);
      setResult(res);
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.message || 'Server error';
      setResult({
        valid: false,
        result: 'TICKET_NOT_FOUND',
        reason: errMsg,
        message: errMsg,
        ticket: null,
      });
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Manual Entry Submit
  // ─────────────────────────────────────────────────────────────────────────

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const token = manualInput.trim();
    if (!token) return;
    setManualInput('');
    await submitToken(token);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Reset / Next Ticket
  // ─────────────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setResult(null);
    if (mode === 'camera') {
      resumeCamera();
    } else {
      setManualInput('');
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Mode Switch
  // ─────────────────────────────────────────────────────────────────────────

  const switchToCamera = () => {
    setResult(null);
    setManualInput('');
    setMode('camera');
  };

  const switchToManual = () => {
    stopCamera();
    setResult(null);
    setMode('manual');
    setTimeout(() => manualInputRef.current?.focus(), 150);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Gate Scanner</h1>
      <p className="text-zinc-500 text-sm mb-6">Rangilo Raas 2026 — Ticket Validation</p>

      {/* Event session banner */}
      <SessionBanner session={session} />

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={switchToCamera}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            mode === 'camera'
              ? 'bg-red-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" />
          SCAN QR CODE
        </button>
        <button
          onClick={switchToManual}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            mode === 'manual'
              ? 'bg-red-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
          }`}
        >
          <KeyboardIcon className="w-4 h-4" />
          ENTER TICKET ID MANUALLY
        </button>
      </div>

      {/* Result panel (shown above scanner when result is present) */}
      {result && <ResultPanel result={result} onReset={handleReset} />}

      {/* ── CAMERA MODE ── */}
      {mode === 'camera' && !result && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden mb-6">
          {/* Camera viewport container — html5-qrcode mounts inside this div */}
          <div
            id={QR_REGION_ID}
            className="w-full"
            style={{ minHeight: '300px', background: '#000' }}
          />

          {/* Status overlays */}
          {cameraState === 'starting' && (
            <div className="flex items-center justify-center gap-3 py-6 text-zinc-400">
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-red-500 rounded-full animate-spin" />
              <span className="text-sm">Starting camera...</span>
            </div>
          )}

          {cameraState === 'scanning' && !loading && (
            <div className="flex items-center justify-center gap-2 py-3 text-green-400 text-sm border-t border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Scanning — point camera at ticket QR code
            </div>
          )}

          {cameraState === 'paused' && loading && (
            <div className="flex items-center justify-center gap-3 py-4 text-zinc-300 text-sm border-t border-zinc-800">
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-red-500 rounded-full animate-spin" />
              Verifying...
            </div>
          )}

          {cameraState === 'error' && (
            <div className="p-6 text-center">
              <CameraOff className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 text-sm mb-4">{cameraError}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => { setCameraState('idle'); html5QrRef.current = null; startCamera(); }}
                  className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-white transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Retry Camera
                </button>
                <button
                  onClick={switchToManual}
                  className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white transition-colors"
                >
                  <KeyboardIcon className="w-4 h-4" /> Use Manual Entry
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MANUAL MODE ── */}
      {mode === 'manual' && !result && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
          <p className="text-zinc-400 text-sm mb-4">
            Enter the Ticket ID printed on the pass (e.g. <code className="bg-zinc-800 px-1 rounded text-xs">RR20-VIP-00001-A4B2</code>) or paste the QR token.
          </p>
          <form onSubmit={handleManualSubmit}>
            <label className="block text-sm text-zinc-400 mb-2">Ticket ID or QR Token</label>
            <input
              ref={manualInputRef}
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="RR20-VIP-00001-A4B2 or paste qrToken..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:border-red-500 mb-4"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={loading || !manualInput.trim()}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg py-3 font-bold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                'VERIFY TICKET'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Info footer */}
      <div className="text-xs text-zinc-600 text-center space-y-1">
        <p>Event day is determined server-side — gate staff cannot override it.</p>
        <p>Each ticket may be admitted once per event day. Simultaneous scans are rejected.</p>
      </div>
    </div>
  );
};

export default AdminScanner;
