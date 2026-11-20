'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserSupabase, organizerFetch } from '../../lib/browser';
import ImportSheet from '../../components/ImportSheet';
import Icon from '../../components/Icon';
import './dashboard.css';

const today = () => new Date().toLocaleDateString('en-CA');

export default function Organizer() {
  const [ready,       setReady]       = useState(false);
  const [events,      setEvents]      = useState([]);
  const [eventId,     setEventId]     = useState('');
  const [newName,     setNewName]     = useState('');
  const [tab,         setTab]         = useState('import');
  const [meetings,    setMeetings]    = useState([]);
  const [members,     setMembers]     = useState([]);
  const [memberCount, setMemberCount] = useState(0);
  const [page,        setPage]        = useState(1);
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState('');
  const [message,     setMessage]     = useState('');
  const router = useRouter();

  const selected = events.find((x) => x.id === eventId);

  useEffect(() => {
    async function init() {
      try {
        await organizerFetch('/api/organizer/me');
        setReady(true);
        const x = await organizerFetch('/api/organizer/events');
        setEvents(x.events);
        if (x.events.length) setEventId(x.events[0].id);
      } catch (e) {
        router.replace('/organizer/login');
      }
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!eventId) return;
    async function run() {
      try {
        const m = await organizerFetch(`/api/organizer/meetings?eventId=${encodeURIComponent(eventId)}`);
        setMeetings(m.meetings);
      } catch (e) {
        setError(e.message);
      }
    }
    run();
  }, [eventId]);

  useEffect(() => {
    if (!eventId || tab !== 'members') return;
    async function run() {
      try {
        const data = await organizerFetch(`/api/organizer/members?eventId=${encodeURIComponent(eventId)}&page=${page}`);
        setMembers(data.members);
        setMemberCount(data.count);
      } catch (e) {
        setError(e.message);
      }
    }
    run();
  }, [eventId, tab, page]);

  async function addEvent(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { event } = await organizerFetch('/api/organizer/events', {
        method: 'POST',
        body: JSON.stringify({ name: newName }),
      });
      setEvents((x) => [event, ...x]);
      setEventId(event.id);
      setTab('import');
      setNewName('');
      setMessage('Event created; share the participant link after importing members.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveMeeting(m) {
    setError('');
    try {
      const { meeting } = await organizerFetch('/api/organizer/meetings', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          meeting_number: m.meeting_number,
          title: m.title,
          meeting_date: m.meeting_date,
          is_open: m.is_open,
          is_completed: m.is_completed,
        }),
      });
      setMeetings((x) => x.map((y) => (y.id === meeting.id ? meeting : y)));
      setMessage(`${meeting.title} saved`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function resetCode(m) {
    if (!confirm(`Restore the password to the last 4 mobile digits + 09 for ${m.first_name} (${m.mobile})? Their existing login session will be invalidated.`)) return;
    setError('');
    try {
      const x = await organizerFetch('/api/organizer/reset-code', {
        method: 'POST',
        body: JSON.stringify({ eventId, memberId: m.id }),
      });
      setMessage(`PASSWORD for ${m.mobile}: ${x.access_code} (last 4 mobile digits + 09). Previous login sessions have been invalidated.`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function exportCSV() {
    setError('');
    try {
      const res = await fetch(`/api/organizer/export?eventId=${encodeURIComponent(eventId)}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selected.slug}-attendance.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      setError(e.message);
    }
  }

  async function logout() {
    await fetch('/api/organizer/logout', { method: 'POST', credentials: 'same-origin' });
    router.push('/organizer/login');
  }

  if (!ready) {
    return (
      <div className="loading-box dashboard-loading" role="status" aria-busy="true">
        <div className="spinner" />
        <span>Checking organizer login…</span>
      </div>
    );
  }

  return (
    <div className="organizer-dashboard">
      {/* ── Dashboard Header ── */}
      <div className="row-space page-toolbar dashboard-header" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Organizer Dashboard</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            Your event control panel (independent of GF)
          </p>
        </div>
        <button className="btn-secondary" aria-label="Sign out" onClick={logout} style={{ flexShrink: 0 }}>
          <Icon name="logout" /><span className="sign-out-text">Sign out</span>
        </button>
      </div>

      {/* ── Create Event + Event Selector ── */}
      <div className="card event-context">
        <form className="event-create" onSubmit={addEvent}>
          <div className="row" style={{ alignItems: 'flex-end', gap: 'var(--space-3)' }}>
            <div style={{ flex: '1 1 240px' }}>
              <label htmlFor="new-event-name">Create a New Event</label>
              <input
                id="new-event-name"
                placeholder="e.g. 3-day Annual Convention"
                required
                minLength={2}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <button type="submit" disabled={busy} style={{ flexShrink: 0 }}>
              <Icon name="plus" /> Create Event
            </button>
          </div>
        </form>

        {events.length > 0 && (
          <div className="form-group event-picker" style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
            <label htmlFor="event-selector">Choose Event</label>
            <select
              id="event-selector"
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setPage(1);
                setMessage('');
              }}
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error   && <div className="error" role="alert">{error}</div>}
      {message && <div className="msg" role="status">{message}</div>}

      {selected && (
        <>
          {/* ── Event Quick Links ── */}
          <div className="card event-links">
            <div className="grid2">
              <div className="share-link">
                <div className="input-hint" style={{ marginBottom: 'var(--space-1)' }}>
                  Participant login link
                </div>
                <p style={{ marginBottom: 'var(--space-3)' }}>
                  <a
                    href={`/join/${selected.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ wordBreak: 'break-all', fontSize: 'var(--text-sm)' }}
                  >
                    {typeof window !== 'undefined' ? window.location.origin : ''}/join/{selected.slug}
                  </a>
                </p>
                <button
                  className="btn-secondary"
                  aria-label="Copy Participant Link"
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${selected.slug}`)}
                >
                  <Icon name="copy" /><span className="link-action-text">Copy Participant Link</span>
                </button>
              </div>

              <div className="scanner-link">
                <div className="input-hint" style={{ marginBottom: 'var(--space-1)' }}>
                  QR scanner link (organizer login required)
                </div>
                <p style={{ marginBottom: 'var(--space-3)' }}>
                  <a className="button btn-secondary" href={`/scan?eventId=${selected.id}`} target="_blank" rel="noreferrer">
                    <Icon name="qr" /> Open Organizer QR Scanner
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* ── Tab Bar ── */}
          <section className="dashboard-workspace" aria-label="Event management">
            <div className="tabbar" aria-label="Event sections">
              {[
                ['import',   'Import Sheet', 'upload'],
                ['members',  'Members', 'users'],
                ['meetings', '3 Meetings', 'calendar'],
                ['report',   'Export', 'download'],
              ].map(([key, label, icon]) => (
                <button
                  key={key}
                  className={tab === key ? 'active' : ''}
                  aria-current={tab === key ? 'page' : undefined}
                  onClick={() => { setTab(key); setError(''); }}
                >
                  <Icon name={icon} />{label}
                </button>
              ))}
            </div>

            {/* ── Import Tab ── */}
            {tab === 'import' && (
              <ImportSheet key={selected.id} event={selected} />
            )}

            {/* ── Members Tab ── */}
            {tab === 'members' && (
              <div className="card dashboard-panel members-panel">
                <div className="row-space data-toolbar" style={{ marginBottom: 'var(--space-4)' }}>
                  <h2 style={{ marginBottom: 0 }}>
                    Members
                    <span
                      className="badge badge-blue"
                      style={{ marginLeft: 'var(--space-2)', verticalAlign: 'middle' }}
                    >
                      {memberCount}
                    </span>
                  </h2>
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      try {
                        const d = await organizerFetch(`/api/organizer/members?eventId=${eventId}&page=${page}`);
                        setMembers(d.members);
                        setMemberCount(d.count);
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    <Icon name="refresh" /> Refresh
                  </button>
                </div>

                <div className="table-wrap member-table-wrap" role="region" aria-label="Members" tabIndex={0}>
                  <table className="member-table" role="table" aria-label="Event members">
                    <thead role="rowgroup">
                      <tr role="row">
                        <th scope="col" role="columnheader">Name</th>
                        <th scope="col" role="columnheader">Mobile</th>
                        <th scope="col" role="columnheader" className="mobile-hide">Status</th>
                        <th scope="col" role="columnheader">Action</th>
                      </tr>
                    </thead>
                    <tbody role="rowgroup">
                      {members.length === 0 && (
                        <tr className="empty-table-row" role="row">
                          <td colSpan={4} role="cell">
                            <div className="dashboard-empty">
                              <Icon name="users" />
                              <h3>No members to display</h3>
                              <p>Import an Excel or CSV sheet to add participants to this event.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                      {members.map((m) => (
                        <tr key={m.id} role="row">
                          <td role="cell" className="member-name" data-label="Name">{[m.first_name, m.father_name, m.surname].filter(Boolean).join(' ')}</td>
                          <td role="cell" data-label="Mobile">{m.mobile}</td>
                          <td role="cell" className="mobile-hide" data-label="Status">
                            {m.profile_confirmed ? (
                              <span className="badge badge-green">✓ Confirmed</span>
                            ) : (
                              <span className="badge badge-amber">Pending</span>
                            )}
                          </td>
                          <td role="cell" data-label="Action">
                            <button
                              className="btn-secondary btn-sm"
                              onClick={() => resetCode(m)}
                            >
                              Reset Password
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="row pagination" style={{ marginTop: 'var(--space-4)' }}>
                  <button
                    className="btn-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((x) => x - 1)}
                  >
                    Previous
                  </button>
                  <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                    Page {page} / {Math.max(1, Math.ceil(memberCount / 50))}
                  </span>
                  <button
                    className="btn-secondary btn-sm"
                    disabled={page * 50 >= memberCount}
                    onClick={() => setPage((x) => x + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* ── Meetings Tab ── */}
            {tab === 'meetings' && (
              <div className="card dashboard-panel meetings-panel">
                <h2>3 Meeting Dates &amp; QR Scanning</h2>
                <p className="muted">
                  Set each meeting date and open the meeting only when staff is ready.
                  QR scans are accepted only on that meeting's date in Asia/Kolkata.
                </p>

                <div className="grid meeting-list">
                  {meetings.map((m) => (
                    <div className="card meeting-item" key={m.id} style={{ marginBottom: 0 }}>
                      <h3>
                        Meeting {m.meeting_number}
                        {m.is_open && (
                          <span className="badge badge-green" style={{ marginLeft: 'var(--space-2)' }}>Open</span>
                        )}
                        {m.is_completed && (
                          <span className="badge badge-muted" style={{ marginLeft: 'var(--space-2)' }}>Completed</span>
                        )}
                      </h3>

                      <div className="form-group">
                        <label htmlFor={`meeting-title-${m.id}`}>Title</label>
                        <input
                          id={`meeting-title-${m.id}`}
                          value={m.title}
                          onChange={(e) =>
                            setMeetings((x) =>
                              x.map((v) => v.id === m.id ? { ...v, title: e.target.value } : v)
                            )
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`meeting-date-${m.id}`}>Date (India)</label>
                        <input
                          id={`meeting-date-${m.id}`}
                          type="date"
                          value={m.meeting_date || ''}
                          onChange={(e) =>
                            setMeetings((x) =>
                              x.map((v) => v.id === m.id ? { ...v, meeting_date: e.target.value } : v)
                            )
                          }
                        />
                      </div>

                      <div className="meeting-options" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 'var(--weight-medium)' }}>
                          <input
                            type="checkbox"
                            checked={m.is_open}
                            onChange={(e) =>
                              setMeetings((x) =>
                                x.map((v) => v.id === m.id ? { ...v, is_open: e.target.checked } : v)
                              )
                            }
                            style={{ width: 'auto', minHeight: 0, margin: 0 }}
                          />
                          Open for scanning
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 'var(--weight-medium)' }}>
                          <input
                            type="checkbox"
                            checked={m.is_completed}
                            onChange={(e) =>
                              setMeetings((x) =>
                                x.map((v) =>
                                  v.id === m.id
                                    ? { ...v, is_completed: e.target.checked, is_open: e.target.checked ? false : v.is_open }
                                    : v
                                )
                              )
                            }
                            style={{ width: 'auto', minHeight: 0, margin: 0 }}
                          />
                          Completed (unscanned members become Absent)
                        </label>
                      </div>

                      <button className="btn-full meeting-save" onClick={() => saveMeeting(m)}>
                        Save Meeting {m.meeting_number}
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 'var(--space-5)' }}>
                  <a className="button" href={`/scan?eventId=${eventId}`}>
                    <Icon name="qr" /> Open QR Scanner
                  </a>
                </div>
              </div>
            )}

            {/* ── Export Tab ── */}
            {tab === 'report' && (
              <div className="card dashboard-panel report-panel">
                <h2>Attendance &amp; Updated Member Excel Report</h2>
                <p className="muted">
                  Downloads a UTF-8 CSV that opens in Excel. Contains member profile fields,
                  custom columns, Meeting 1–3 attendance, and total present count.
                </p>

                <button className="btn-primary" onClick={exportCSV} style={{ marginBottom: 'var(--space-4)' }}>
                  <Icon name="download" /> Download Updated Attendance CSV
                </button>

                <div className="notice">
                  Pending remains Pending until you mark a meeting "Completed";
                  only then do unscanned members become Absent.
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
