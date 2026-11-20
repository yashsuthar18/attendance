'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEYS = [
  ['first_name',   'First Name / નામ'],
  ['father_name',  'Father Name / પિતાનું નામ'],
  ['surname',      'Surname / અટક'],
  ['pincode',      'PIN Code / પિનકોડ'],
  ['village',      'Village / ગામ'],
  ['taluka',       'Taluka / તાલુકો'],
  ['district',     'District / જિલ્લો'],
  ['address',      'Address / સરનામું'],
];

export default function MemberCard() {
  const [member,  setMember]  = useState(null);
  const [event,   setEvent]   = useState(null);
  const [fields,  setFields]  = useState({});
  const [qr,      setQr]      = useState('');
  const [busy,    setBusy]    = useState(true);
  const [error,   setError]   = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/member/me', { cache: 'no-store' });
      if (!res.ok) throw new Error('Please use your event login link to sign in');
      const data = await res.json();
      setMember(data.member);
      setEvent(data.event);
      setFields({ ...data.member });
      if (data.member.profile_confirmed && data.member.qr_token) {
        const qrLib = (await import('qrcode')).default;
        setQr(await qrLib.toDataURL(`EVENTQR:${data.member.qr_token}`, {
          width: 250,
          margin: 2,
          errorCorrectionLevel: 'M',
        }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function confirm(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/member/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Unable to confirm');
      setMessage('Profile confirmed successfully. Your QR card is ready.');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/member/logout', { method: 'POST' });
    window.location.href = '/';
  }

  /* ── Loading state ── */
  if (busy && !member) {
    return (
      <div className="loading-box participant-state" role="status" aria-busy="true">
        <div className="spinner" />
        <span>Loading member profile…</span>
      </div>
    );
  }

  /* ── Error / no session ── */
  if (error && !member) {
    return (
      <div className="narrow participant-state">
        <div className="card">
          <h1>Participant Session</h1>
          <div className="error" role="alert">{error}</div>
          <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>
            Open the personal login link provided by your organizer.
          </p>
          <a className="button btn-secondary" href="/">Back Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="participant-page">
      {/* ── Page Header with Logout ── */}
      <div className="row-space page-toolbar hide-print" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>{member.profile_confirmed ? 'Your Digital QR Card' : 'Confirm Your Details'}</h1>
          <p className="muted" style={{ marginBottom: 0 }}>{event?.name}</p>
        </div>
        <button className="btn-secondary hide-print" onClick={logout} style={{ flexShrink: 0 }}>
          Logout
        </button>
      </div>

      {error   && <div className="error hide-print" role="alert">{error}</div>}
      {message && <div className="msg   hide-print" role="status">{message}</div>}

      {/* ── Confirm Profile Form ── */}
      {!member.profile_confirmed ? (
        <div className="card narrow profile-form">
          <div className="info" style={{ marginBottom: 'var(--space-5)' }}>
            Imported details are prefilled. Fill any missing information and correct errors.
            You can confirm <strong>only once</strong>; contact the organizer for later corrections.
          </div>

          <form onSubmit={confirm}>
            {/* Mobile — read-only */}
            <div className="form-group">
              <label htmlFor="profile-mobile">Mobile (cannot change)</label>
              <input
                id="profile-mobile"
                value={member.mobile}
                disabled
                style={{ background: 'var(--bg)', color: 'var(--ink-muted)', fontWeight: 'var(--weight-semibold)' }}
              />
            </div>

            {/* Standard fields in 2-col grid */}
            <div className="grid2">
              {KEYS.map(([key, label]) => (
                <div className="form-group" key={key} style={{ marginBottom: 'var(--space-4)' }}>
                  <label htmlFor={`profile-${key}`}>
                    {label}
                    {!fields[key] && (
                      <span className="badge badge-amber" style={{ marginLeft: 'var(--space-2)', verticalAlign: 'middle' }}>
                        Pending
                      </span>
                    )}
                  </label>
                  <input
                    id={`profile-${key}`}
                    required={key === 'first_name' || key === 'surname'}
                    value={fields[key] || ''}
                    onChange={(e) => setFields((x) => ({ ...x, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* Extra/custom imported fields */}
            {Object.keys(fields.extra_data || {}).length > 0 && (
              <>
                <hr className="divider" />
                <h3>Additional Imported Details</h3>
                <div className="grid2">
                  {Object.entries(fields.extra_data || {}).map(([key, value]) => (
                    <div className="form-group" key={key} style={{ marginBottom: 'var(--space-4)' }}>
                      <label htmlFor={`extra-${key}`}>{key}</label>
                      <input
                        id={`extra-${key}`}
                        value={value || ''}
                        onChange={(e) =>
                          setFields((x) => ({
                            ...x,
                            extra_data: { ...x.extra_data, [key]: e.target.value },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary btn-full"
              style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-base)' }}
            >
              {busy ? (
                <><span className="spinner spinner-sm" /> Saving…</>
              ) : (
                'Confirm & Save My Details'
              )}
            </button>
          </form>
        </div>
      ) : (
        /* ── Confirmed: show card + download ── */
        <div className="grid2 card-layout">
          {/* Digital ID Card */}
          <div className="cardprint">
            <div className="card-heading">
              <div className="card-event-label">PARTICIPANT DIGITAL ID CARD</div>
              <h2>{event.name}</h2>
            </div>

            <div className="card-identity">
              <div className="card-name">
                {[member.first_name, member.father_name, member.surname]
                  .filter(Boolean)
                  .join(' ')}
              </div>

              <div className="card-meta card-member-id">
                Member ID: {member.id.slice(0, 8).toUpperCase()}
              </div>
              <div className="card-meta">
                Mobile: {member.mobile.slice(0, 2)}••••••{member.mobile.slice(-2)}
              </div>
              {(member.village || member.taluka) && (
                <div className="card-meta card-location">
                  {member.village}{member.taluka ? `, ${member.taluka}` : ''}
                </div>
              )}
            </div>

            {qr && (
              <div className="qrbox">
                <img src={qr} alt="QR attendance code" width="185" height="185" />
              </div>
            )}

            <p className="card-footer-note">
              Present this QR to authorized staff at each meeting.
            </p>
          </div>

          {/* Download / Print panel */}
          <div className="card hide-print download-panel">
            <h2>Card Download</h2>
            <p className="muted">
              Your account is confirmed. The same QR works for all 3 meetings,
              but attendance is recorded separately per meeting.
            </p>

            <button
              className="btn-primary btn-full"
              onClick={() => window.print()}
              style={{ marginBottom: 'var(--space-3)' }}
            >
              Print / Save as PDF
            </button>

            <div className="input-hint" style={{ textAlign: 'left' }}>
              On mobile, select <strong>"Save as PDF"</strong> from the browser print options.
              Do not share your QR publicly.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
