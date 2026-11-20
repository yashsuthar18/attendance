'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthHeader from '../../../components/AuthHeader';

const MOBILE_KEY = 'org_mobile_saved';

export default function OrganizerLogin() {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mobileSaved, setMobileSaved] = useState(false);
  const mobileRef = useRef(null);
  const router = useRouter();

  // Auto-fill saved mobile on load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MOBILE_KEY);
      if (saved && /^[0-9]{10}$/.test(saved)) {
        setMobile(saved);
        setMobileSaved(true);
      } else {
        mobileRef.current?.focus();
      }
    } catch (_) {
      mobileRef.current?.focus();
    }
  }, []);

  function handleMobileChange(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(val);
    setMobileSaved(false);
  }

  function clearSaved() {
    try { localStorage.removeItem(MOBILE_KEY); } catch (_) {}
    setMobile('');
    setMobileSaved(false);
    setTimeout(() => mobileRef.current?.focus(), 50);
  }

  async function login(e) {
    e.preventDefault();
    if (!/^[6-9][0-9]{9}$/.test(mobile)) {
      setError('કૃપા કરી 10 અંકનો માન્ય ભારતીય મોબાઇલ નંબર દાખલ કરો.');
      mobileRef.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/organizer/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Login failed');
      // Save mobile for next time
      try { localStorage.setItem(MOBILE_KEY, mobile); } catch (_) {}
      router.replace('/organizer');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow auth-shell organizer-login">
      <div className="card">
        <AuthHeader icon="lock" title="Organizer Dashboard Login">
          Organizer Dashboard — Independent Event QR System
        </AuthHeader>

        {/* Warning notice */}
        <div className="notice auth-guidance">
          ફક્ત authorized organizer જ login કરી શકે. Public signup ઉપલબ્ધ નથી.
        </div>

        <form onSubmit={login} noValidate>
          {/* Mobile Number */}
          <div className="form-group">
            <label htmlFor="org-mobile">
              Organizer Mobile Number / મોબાઇલ નંબર
              <span className="req"> *</span>
            </label>

            {mobileSaved && (
              <div className="mobile-banner">
                <span className="mobile-banner-text">
                  સાચવેલ નંબર:{' '}
                  <strong>{mobile.slice(0, 2)}••••••{mobile.slice(-2)}</strong>
                </span>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={clearSaved}
                >
                  બદલો
                </button>
              </div>
            )}

            <input
              id="org-mobile"
              ref={mobileRef}
              type="tel"
              inputMode="numeric"
              placeholder="દા.ત. 9876543210"
              pattern="[6-9][0-9]{9}"
              minLength={10}
              maxLength={10}
              autoComplete="tel-national"
              required
              value={mobile}
              onChange={handleMobileChange}
              style={mobileSaved ? { background: 'var(--brand-soft)', fontWeight: 'var(--weight-semibold)' } : {}}
            />
            <div className="input-hint phone-hint">10 અંકનો ભારતીય મોબાઇલ નંબર — +91 વગર</div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="org-password">
              Password / પાસવર્ડ
              <span className="req"> *</span>
            </label>
            <input
              id="org-password"
              type="password"
              placeholder="Organizer password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary btn-full"
            style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-base)' }}
          >
            {busy ? (
              <>
                <span className="spinner spinner-sm" />
                ચકાસી રહ્યા છીએ…
              </>
            ) : (
              'Organizer Login'
            )}
          </button>
        </form>

        <hr className="divider auth-divider" />

        <p className="input-hint auth-setup-note" style={{ textAlign: 'left', marginBottom: 0 }}>
          Organizer account Supabase dashboard / setup script દ્વારા બને છે. Public signup નથી.
        </p>
      </div>
    </div>
  );
}
