import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { AviatorGame } from '../components/AviatorGame';
import { OcrScanner } from '../components/OcrScanner';
import { PlayerStats } from '../components/PlayerStats';
import { Leaderboard } from '../components/Leaderboard';
import { User } from '../types';

type AuthMode = 'email' | 'phone';
type TabType = 'play' | 'stats' | 'leaderboard' | 'ocr';

function getAuthRedirectUrl(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }

  return url.endsWith('/') ? url : `${url}/`;
}

function parseAuthHashError(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (!hash.startsWith('#')) return null;

  const params = new URLSearchParams(hash.slice(1));
  const code = params.get('error_code');
  const description = params.get('error_description');

  if (!code && !description) return null;

  let friendly = 'Authentication failed. Please request a new OTP link.';

  if (code === 'otp_expired') {
    friendly = 'Your sign-in link expired. Request a new OTP and try again.';
  }

  if (code === 'access_denied') {
    friendly = 'Access denied for this OTP link. Request a fresh one.';
  }

  if (description) {
    friendly = `${friendly} (${description.replace(/\+/g, ' ')})`;
  }

  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  return friendly;
}

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('play');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCooldownUntil, setOtpCooldownUntil] = useState<number>(0);
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState(0);

  const signedInLabel = useMemo(() => {
    if (!session?.user) return '';
    return session.user.email ?? session.user.phone ?? 'Pilot';
  }, [session]);

  useEffect(() => {
    const hashError = parseAuthHashError();
    if (hashError) {
      setMessage(hashError);
      setIsError(true);
    }

    if (!supabase) {
      setMessage('Supabase configuration missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      setIsError(true);
      return;
    }

    const client = supabase;

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'SIGNED_IN') {
        setIsError(false);
        setMessage('Welcome to WOW. You are signed in.');
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!otpCooldownUntil) {
      setOtpCooldownSeconds(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((otpCooldownUntil - Date.now()) / 1000));
      setOtpCooldownSeconds(remaining);
    };

    tick();
    const timer = window.setInterval(tick, 1000);

    return () => window.clearInterval(timer);
  }, [otpCooldownUntil]);

  const startOtpCooldown = (seconds: number) => {
    setOtpCooldownUntil(Date.now() + seconds * 1000);
  };

  const handleSignIn = async () => {
    if (otpCooldownSeconds > 0) {
      setIsError(true);
      setMessage(`Please wait ${otpCooldownSeconds}s before requesting another OTP.`);
      return;
    }

    if (!supabase) {
      setIsError(true);
      setMessage('Supabase is not configured for this environment.');
      return;
    }

    const client = supabase;

    setIsError(false);
    setMessage('Sending OTP...');

    if (authMode === 'email') {
      if (!email.trim()) {
        setIsError(true);
        setMessage('Please enter your email address.');
        return;
      }

      setSendingOtp(true);
      try {
        const { error } = await client.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
          },
        });

        if (error) {
          setIsError(true);
          if (error.message.toLowerCase().includes('rate limit')) {
            startOtpCooldown(60);
            setMessage('Email rate limit reached. Please wait 60 seconds, then try again.');
          } else {
            setMessage(error.message);
          }
          return;
        }

        startOtpCooldown(60);
        setMessage('Check your inbox for the WOW login link.');
      } finally {
        setSendingOtp(false);
      }
      return;
    }

    if (!phone.trim()) {
      setIsError(true);
      setMessage('Please enter your phone number in international format.');
      return;
    }

    setSendingOtp(true);
    try {
      const { error } = await client.auth.signInWithOtp({ phone: phone.trim() });
      if (error) {
        setIsError(true);
        if (error.message.toLowerCase().includes('rate limit')) {
          startOtpCooldown(60);
          setMessage('OTP rate limit reached. Please wait 60 seconds, then try again.');
        } else {
          setMessage(error.message);
        }
        return;
      }

      startOtpCooldown(60);
      setMessage('Check your phone for your OTP code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) {
      setSession(null);
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsError(false);
    setMessage('Signed out safely.');
  };

  return (
    <main className="wow-shell">
      <header className="wow-header" style={{ marginBottom: 30 }}>
        <h1 className="wow-hero-glow">WOW</h1>
        <p className="wow-subtitle">
          Neon-speed crash gameplay with OTP login. Launch, watch the multiplier surge, and cash out before the rocket burns.
        </p>
      </header>

      {session?.user ? (
        <div className="wow-grid">
          <div className="wow-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <div className="wow-label">Signed in as</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{signedInLabel}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="wow-pill">WOW Pilot</span>
              <button className="wow-btn wow-btn-secondary" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </div>

          <div className="wow-tabs">
            {(['play', 'stats', 'leaderboard', 'ocr'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`wow-btn ${activeTab === tab ? 'wow-tab-active' : 'wow-btn-secondary'}`}
              >
                {tab === 'play' ? 'Play' : tab === 'stats' ? 'Stats' : tab === 'leaderboard' ? 'Leaderboard' : 'OCR'}
              </button>
            ))}
          </div>

          {activeTab === 'play' && <AviatorGame />}
          {activeTab === 'stats' && <PlayerStats user={user} userId={session.user.id} />}
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'ocr' && <OcrScanner />}
        </div>
      ) : (
        <div className="wow-grid">
          <section className="wow-card">
            <h2 style={{ marginTop: 0 }}>Sign In to WOW</h2>

            <div className="wow-auth-toggle" style={{ marginBottom: 18 }}>
              <button
                onClick={() => setAuthMode('email')}
                className={`wow-btn ${authMode === 'email' ? 'wow-tab-active' : 'wow-btn-secondary'}`}
              >
                Email OTP
              </button>
              <button
                onClick={() => setAuthMode('phone')}
                className={`wow-btn ${authMode === 'phone' ? 'wow-tab-active' : 'wow-btn-secondary'}`}
              >
                Phone OTP
              </button>
            </div>

            {authMode === 'email' ? (
              <label className="wow-field" style={{ marginBottom: 16 }}>
                <span className="wow-label">Email Address</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  className="wow-input"
                />
              </label>
            ) : (
              <label className="wow-field" style={{ marginBottom: 16 }}>
                <span className="wow-label">Phone Number</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  type="tel"
                  placeholder="+1234567890"
                  className="wow-input"
                />
              </label>
            )}

            <button
              onClick={handleSignIn}
              className="wow-btn wow-btn-primary"
              style={{ width: '100%', fontSize: 16 }}
              disabled={sendingOtp || otpCooldownSeconds > 0}
            >
              {sendingOtp ? 'Sending...' : otpCooldownSeconds > 0 ? `Retry in ${otpCooldownSeconds}s` : 'Send OTP'}
            </button>

            {message && <p className={`wow-message ${isError ? 'wow-message-error' : ''}`}>{message}</p>}
          </section>

          <section className="wow-card">
            <h3 style={{ marginTop: 0 }}>How WOW Works</h3>
            <ul style={{ color: '#d8cbf4', lineHeight: 1.9, marginBottom: 0, paddingLeft: 20 }}>
              <li>Login with OTP from email or phone.</li>
              <li>Set your wager and launch a new round.</li>
              <li>Track the live multiplier as the rocket climbs.</li>
              <li>Cash out before crash to lock profit.</li>
              <li>Use leaderboard and stats to improve strategy.</li>
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
