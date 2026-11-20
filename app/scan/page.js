'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { organizerFetch, browserSupabase } from '../../lib/browser';
import Icon from '../../components/Icon';

function ScannerContent() {
  const query     = useSearchParams();
  const router    = useRouter();
  const eventId   = query.get('eventId');
  const [meetings,  setMeetings]  = useState([]);
  const [meetingId, setMeetingId] = useState('');
  const [reading,   setReading]   = useState(false);
  const [manual,    setManual]    = useState('');
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState('');
  const scanner = useRef(null);
  const lock    = useRef(false);

  useEffect(() => {
    if (!eventId) return;
    organizerFetch(`/api/organizer/meetings?eventId=${encodeURIComponent(eventId)}`)
      .then((d) => {
        setMeetings(d.meetings);
        if (d.meetings[0]) setMeetingId(d.meetings[0].id);
      })
      .catch((e) => {
        setError(e.message);
        router.replace('/organizer/login');
      });
  }, [eventId, router]);

  async function send(qrValue) {
    if (lock.current || !qrValue) return;
    lock.current = true;
    setError('');
    try {
      const r = await organizerFetch('/api/organizer/scan', {
        method: 'POST',
        body: JSON.stringify({ eventId, meetingId, qrValue }),
      });
      setResult(r);
    } catch (e) {
      setResult(null);
      setError(e.message);
    } finally {
      setTimeout(() => (lock.current = false), 2000);
    }
  }

  async function start() {
    if (!meetingId) return;
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const inst = new Html5Qrcode('reader');
      scanner.current = inst;
      await inst.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: 220 },
        (txt) => send(txt),
        () => {}
      );
      setReading(true);
    } catch (e) {
      setError(`Camera failed: ${e.message}. Open this page on HTTPS and allow camera access.`);
    }
  }

  async function stop() {
    if (scanner.current) {
      try { await scanner.current.stop(); } catch {}
      try { scanner.current.clear(); } catch {}
      scanner.current = null;
    }
    setReading(false);
  }

  useEffect(() => () => {
    if (scanner.current) {
      scanner.current.stop().catch(() => {}).then(() => scanner.current?.clear()).catch(() => {});
    }
  }, []);

  return (
    <>
      {/* ── Page Header ── */}
      <div className="page-header">
        <h1>Authorized QR Scanner</h1>
        <p className="muted">
          Login as the organizer; choose today's active meeting.
          Only authorized organizer sessions can record attendance.
        </p>
      </div>

      {!eventId ? (
        <div className="error" role="alert">
          Open scanner from the Organizer Dashboard to select an event.
        </div>
      ) : (
        <>
          {/* ── Scanner Setup Card ── */}
          <div className="card scanner-workspace">
            {/* Meeting selector */}
            <div className="form-group">
              <label htmlFor="meeting-select">Select Meeting</label>
              <select
                id="meeting-select"
                value={meetingId}
                disabled={reading}
                onChange={(e) => { setMeetingId(e.target.value); setResult(null); }}
              >
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    #{m.meeting_number} — {m.title} — {m.meeting_date || 'Date not set'}{' '}
                    {m.is_open ? '(Open)' : '(Closed)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Camera controls */}
            <div className="row camera-controls" style={{ marginBottom: 'var(--space-5)' }}>
              <button
                className="btn-primary"
                disabled={reading || !meetingId}
                onClick={start}
              >
                <Icon name="camera" /> Start Camera Scanner
              </button>
              <button
                className="btn-secondary"
                disabled={!reading}
                onClick={stop}
              >
                Stop Camera
              </button>
            </div>

            {/* Camera reader box */}
            <div className="camera-preview">
              <div id="reader" style={{ width: '100%' }} />
              {!reading && (
                <div className="camera-placeholder">
                  <Icon name="camera" /> Camera preview will appear here when scanning starts
                </div>
              )}
            </div>
          </div>

          {/* ── Scan Result ── */}
          {result && (
            result.status === 'present' ? (
              <div className="scan-result-present" role="status">
                <Icon name="check" />
                <div
                  style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', color: 'var(--green)', marginBottom: 'var(--space-1)' }}
                >
                  PRESENT
                </div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-1)' }}>
                  {[result.member.first_name, result.member.father_name, result.member.surname]
                    .filter(Boolean).join(' ')}
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                  {result.member.mobile} — {result.message}
                </div>
              </div>
            ) : (
              <div className="scan-result-duplicate" role="status">
                <Icon name="warning" />
                <div
                  style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--amber)', marginBottom: 'var(--space-1)' }}
                >
                  Already Scanned
                </div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-1)' }}>
                  {[result.member.first_name, result.member.father_name, result.member.surname]
                    .filter(Boolean).join(' ')}
                </div>
                <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                  {result.member.mobile} — {result.message}
                </div>
              </div>
            )
          )}

          {error && <div className="error" role="alert">{error}</div>}

          {/* ── Manual Input Fallback ── */}
          <div className="card scanner-backup">
            <h3>Manual QR Entry (Backup)</h3>
            <p className="muted" style={{ marginBottom: 'var(--space-3)' }}>
              If the camera is unavailable, paste or type the QR payload directly.
            </p>
            <div className="row">
              <input
                aria-label="Manual QR Entry (Backup)"
                style={{ flex: 1 }}
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="EVENTQR:…"
              />
              <button onClick={() => send(manual)}>
                Mark Attendance
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function Scanner() {
  return (
    <Suspense
      fallback={
        <div className="loading-box" role="status" aria-busy="true">
          <div className="spinner" />
          <span>Loading scanner…</span>
        </div>
      }
    >
      <ScannerContent />
    </Suspense>
  );
}
