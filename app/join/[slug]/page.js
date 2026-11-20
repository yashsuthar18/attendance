'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import AuthHeader from '../../../components/AuthHeader';

const MOBILE_STORAGE_KEY = 'member_mobile_saved';

export default function MemberLogin() {
  const { slug } = useParams();
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mobileSaved, setMobileSaved] = useState(false);
  const mobileRef = useRef(null);

  // Page load થાય ત્યારે localStorage માંથી mobile number auto-fill
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MOBILE_STORAGE_KEY);
      if (saved && /^[0-9]{10}$/.test(saved)) {
        setMobile(saved);
        setMobileSaved(true);
      } else {
        // Saved mobile ન હોય તો mobile field પર focus
        mobileRef.current?.focus();
      }
    } catch (_) {
      mobileRef.current?.focus();
    }
  }, []);

  function handleMobileChange(e) {
    // Only digits, max 10
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(val);
    setMobileSaved(false);
  }

  function clearSavedMobile() {
    try { localStorage.removeItem(MOBILE_STORAGE_KEY); } catch (_) {}
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
      const res = await fetch('/api/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, mobile, accessCode }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Login થઈ શક્યું નહીં');
      // Login સફળ — mobile number save for next time
      try { localStorage.setItem(MOBILE_STORAGE_KEY, mobile); } catch (_) {}
      router.push('/my-card');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow auth-shell participant-login">
      <div className="card">
        <AuthHeader icon="card" title="Participant Login">
          Event: <strong style={{ color: 'var(--ink)' }}>{slug}</strong>
        </AuthHeader>

        <div className="info auth-guidance">
          નોંધણી સમયે આપેલ <strong>મોબાઇલ નંબર</strong> અને <strong>પાસવર્ડ</strong> દાખલ કરો.
        </div>

        <form onSubmit={login} noValidate>
          {/* ─── Mobile Number ─── */}
          <div className="form-group">
            <label htmlFor="mobile-input">
              Mobile Number / મોબાઇલ નંબર
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
                  onClick={clearSavedMobile}
                >
                  બદલો
                </button>
              </div>
            )}

            <input
              id="mobile-input"
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

          {/* ─── Access Code ─── */}
          <div className="form-group">
            <label htmlFor="code-input">
              Password / પાસવર્ડ
              <span className="req"> *</span>
            </label>
            <input
              id="code-input"
              type="password"
              inputMode="numeric"
              placeholder="દા.ત. 321009"
              autoComplete="current-password"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
            />
            <div className="input-hint">
              તમારા મોબાઇલ નંબરના છેલ્લા 4 અંક પછી 09 લખો. ઉદાહરણ: 9876543210 → 321009.
            </div>
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
              'Login & Continue'
            )}
          </button>
        </form>

        <hr className="divider auth-divider" />

        <div className="notice auth-members-note" style={{ marginBottom: 0 }}>
          આ system SMS OTP વાપરતી નથી. Login ફક્ત આયાત કરેલા સભ્યો માટે છે.
        </div>
      </div>
    </div>
  );
}
