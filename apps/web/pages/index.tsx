import { ChangeEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AviatorGame } from '../components/AviatorGame';
import { OcrScanner } from '../components/OcrScanner';
import { PlayerStats } from '../components/PlayerStats';
import { Leaderboard } from '../components/Leaderboard';
import { User } from '../types';

type AuthMode = 'email' | 'phone';
type TabType = 'play' | 'stats' | 'leaderboard' | 'ocr';

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('play');

  useEffect(() => {
    if (!supabase) {
      setMessage('Supabase configuration missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }

    const client = supabase;

    const getSession = async () => {
      const {
        data: { session }
      } = await client.auth.getSession();
      setSession(session);
    };

    getSession();

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    if (!supabase) {
      setMessage('Supabase not configured. Set environment variables in apps/web/.env.local.');
      return;
    }

    const client = supabase;
    setMessage('Sending OTP...');

    if (authMode === 'email') {
      const { error } = await client.auth.signInWithOtp({ email });
      if (error) {
        setMessage(error.message);
        return;
      }
      setMessage('Check your email for the magic link/OTP to sign in.');
    } else {
      const { error } = await client.auth.signInWithOtp({ phone });
      if (error) {
        setMessage(error.message);
        return;
      }
      setMessage('Check your phone for the OTP code to sign in.');
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
    setMessage('Signed out.');
  };

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', color: '#f4f4f4', fontFamily: 'Arial, sans-serif', minHeight: '100vh', background: '#0b0f16' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 42, marginBottom: 8 }}>🚀 WOW Aviator Rocket</h1>
        <p style={{ color: '#999', maxWidth: 680, margin: 0 }}>
          Multiply your bets before the rocket crashes. Test your nerve and timing with real-time multiplier action.
        </p>
      </header>

      {session?.user ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '16px 20px', border: '1px solid #333', borderRadius: 10, background: '#10131b' }}>
            <div>
              <div style={{ fontSize: 14, color: '#999' }}>Signed in as</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                {session.user.email ?? session.user.phone ?? 'Player'}
              </div>
            </div>
            <button onClick={handleSignOut} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#555', color: '#fff', cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {(['play', 'stats', 'leaderboard', 'ocr'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === tab ? '#15c39a' : '#1f2731',
                  color: activeTab === tab ? '#000' : '#fff',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {tab === 'play' ? '🎮 Play' : tab === 'stats' ? '📊 Stats' : tab === 'leaderboard' ? '🏆 Leaderboard' : '📸 OCR'}
              </button>
            ))}
          </div>

          {activeTab === 'play' && <AviatorGame />}
          {activeTab === 'stats' && <PlayerStats user={user} userId={session.user.id} />}
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'ocr' && <OcrScanner />}
        </div>
      ) : (
        <div>
          <section style={{ marginBottom: 24, padding: 28, border: '1px solid #333', borderRadius: 14, background: '#10131b' }}>
            <h2 style={{ marginTop: 0 }}>Sign In to Play</h2>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button
                onClick={() => setAuthMode('email')}
                style={{
                  padding: '12px 20px',
                  background: authMode === 'email' ? '#15c39a' : '#1f2731',
                  color: authMode === 'email' ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Email OTP
              </button>
              <button
                onClick={() => setAuthMode('phone')}
                style={{
                  padding: '12px 20px',
                  background: authMode === 'phone' ? '#15c39a' : '#1f2731',
                  color: authMode === 'phone' ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Phone OTP
              </button>
            </div>

            {authMode === 'email' ? (
              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ display: 'block', fontSize: 14, color: '#999', marginBottom: 8 }}>Email Address</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #333', background: '#0f1724', color: '#f4f4f4', fontSize: 14 }}
                />
              </label>
            ) : (
              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ display: 'block', fontSize: 14, color: '#999', marginBottom: 8 }}>Phone Number</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  type="tel"
                  placeholder="+1234567890"
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #333', background: '#0f1724', color: '#f4f4f4', fontSize: 14 }}
                />
              </label>
            )}

            <button
              onClick={handleSignIn}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 8,
                border: 'none',
                color: '#000',
                background: '#15c39a',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer'
              }}
            >
              Send OTP
            </button>

            {message && <p style={{ marginTop: 16, color: '#cbd5e1', fontSize: 14 }}>{message}</p>}
          </section>

          <section style={{ padding: 28, border: '1px solid #333', borderRadius: 14, background: '#10131b' }}>
            <h3>How to Play</h3>
            <ul style={{ color: '#bbb', lineHeight: 1.8 }}>
              <li>Sign in with email or phone OTP</li>
              <li>Place a wager (min $0.10)</li>
              <li>Watch the multiplier climb</li>
              <li>Cash out before the rocket crashes</li>
              <li>Higher multiplier = higher risk & reward</li>
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}

