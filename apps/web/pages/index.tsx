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

const TABS: { key: TabType; label: string }[] = [
  { key: 'play', label: 'Play' },
  { key: 'stats', label: 'Stats' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'ocr', label: 'OCR' },
];

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('play');
  const [showWowLoading, setShowWowLoading] = useState(true);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCooldownUntil, setOtpCooldownUntil] = useState<number>(0);
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState(0);

  const signedInLabel = useMemo(() => {
    if (!session?.user) return '';
    return session.user.email ?? session.user.phone ?? 'Pilot';
  }, [session]);

  useEffect(() => {
    const bootTimer = window.setTimeout(() => setShowWowLoading(false), 1200);
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

    const loadUserProfile = async (userId: string) => {
      const { data } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) {
        setUser(data as User);
      }
    };

    client.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        await loadUserProfile(data.session.user.id);
      }
    });

    const { data: listener } = client.auth.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession);
      if (event === 'SIGNED_IN') {
        setIsError(false);
        setMessage('Welcome to WOW. You are signed in.');
      }
      if (nextSession?.user?.id) {
        await loadUserProfile(nextSession.user.id);
      }
    });

    return () => {
      window.clearTimeout(bootTimer);
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user || activeTab !== 'play') return;
    setShowWowLoading(true);
    const tabTimer = window.setTimeout(() => setShowWowLoading(false), 850);
    return () => window.clearTimeout(tabTimer);
  }, [activeTab, session?.user]);

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

  const playingView = session?.user && activeTab === 'play';

  return (
    <main className={`min-h-screen ${playingView ? 'px-2 pb-3 pt-2' : 'mx-auto max-w-6xl px-4 pb-10 pt-6'}`}>
      {showWowLoading && (
        <div className="fixed inset-0 z-[5000] grid place-items-center bg-[radial-gradient(circle_at_50%_45%,rgba(187,93,255,0.3),rgba(6,3,15,0.96)_50%)]">
          <div className="animate-wow-loader font-orbitron text-5xl font-extrabold tracking-[0.08em] text-white drop-shadow-[0_0_20px_rgba(187,93,255,0.85)] md:text-7xl">
            WOW...
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-30 mb-3 rounded-2xl border border-slate-800/90 bg-slate-950/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="wow-title text-2xl md:text-3xl">WOW</h1>
            <p className="text-xs text-slate-400 md:text-sm">
              {playingView ? 'Aviator Pro Arena' : 'Premium crash game experience'}
            </p>
          </div>

          {session?.user && (
            <div className="hidden flex-wrap items-center gap-2 lg:flex">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-wow-purple to-wow-pink text-[#130320]'
                      : 'border border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {session?.user ? (
            <div className="flex items-center gap-2">
              <span className="wow-pill max-w-[180px] truncate">{signedInLabel}</span>
              <button className="wow-btn-secondary" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          ) : (
            <span className="wow-pill">Guest Mode</span>
          )}
        </div>

        {session?.user && (
          <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-wow-purple to-wow-pink text-[#130320]'
                    : 'border border-slate-700 bg-slate-900 text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {session?.user ? (
        <section className="space-y-4">
          {activeTab === 'play' && <AviatorGame />}
          {activeTab === 'stats' && <PlayerStats user={user} userId={session.user.id} />}
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'ocr' && <OcrScanner />}
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="wow-card">
            <h2 className="mb-4 mt-0 text-2xl font-extrabold text-slate-100">Sign In to WOW</h2>

            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setAuthMode('email')}
                className={authMode === 'email' ? 'wow-btn-primary' : 'wow-btn-secondary'}
              >
                Email OTP
              </button>
              <button
                onClick={() => setAuthMode('phone')}
                className={authMode === 'phone' ? 'wow-btn-primary' : 'wow-btn-secondary'}
              >
                Phone OTP
              </button>
            </div>

            {authMode === 'email' ? (
              <label className="mb-4 block">
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
              <label className="mb-4 block">
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
              className="wow-btn-primary w-full text-base"
              disabled={sendingOtp || otpCooldownSeconds > 0}
            >
              {sendingOtp ? 'Sending...' : otpCooldownSeconds > 0 ? `Retry in ${otpCooldownSeconds}s` : 'Send OTP'}
            </button>

            {message && <p className={`wow-message ${isError ? 'wow-message-error' : ''}`}>{message}</p>}
          </div>

          <div className="wow-card">
            <h3 className="mb-3 mt-0 text-xl font-bold text-slate-100">How WOW Works</h3>
            <ul className="space-y-2 pl-5 text-slate-300">
              <li>Login with OTP from email or phone.</li>
              <li>Place your wager and launch a round.</li>
              <li>Watch multiplier rise in real time.</li>
              <li>Cash out before crash to lock profit.</li>
              <li>Track your progress on stats and leaderboard.</li>
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
