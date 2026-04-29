import { useEffect, useMemo, useState } from 'react';

interface AviatorGameProps {
  onGameStart?: (wager: number) => void;
  onGameCashOut?: (multiplier: number) => void;
  balance?: number;
}

const CRASH_MIN = 1.3;
const CRASH_MAX = 5.0;

export function AviatorGame(props: AviatorGameProps) {
  const [playing, setPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashAt, setCrashAt] = useState(CRASH_MAX);
  const [result, setResult] = useState<string | null>(null);
  const [cashOut, setCashOut] = useState<number | null>(null);
  const [wager, setWager] = useState(10);
  const [crashed, setCrashed] = useState(false);

  const progress = useMemo(() => Math.min((multiplier / crashAt) * 100, 100), [multiplier, crashAt]);

  const randomCrashPoint = () => Math.random() * (CRASH_MAX - CRASH_MIN) + CRASH_MIN;

  useEffect(() => {
    if (!playing) return;

    const interval = window.setInterval(() => {
      setMultiplier((current) => {
        const next = current + current * 0.015 + 0.02;
        if (next >= crashAt) {
          window.clearInterval(interval);
          setResult('Rocket crashed. Round lost.');
          setCrashed(true);
          setPlaying(false);
          return crashAt;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [playing, crashAt]);

  const handleStart = () => {
    if (wager <= 0) {
      setResult('Wager must be greater than 0.');
      return;
    }

    props.onGameStart?.(wager);

    setMultiplier(1.0);
    setCrashAt(randomCrashPoint());
    setResult(null);
    setCashOut(null);
    setCrashed(false);
    setPlaying(true);
  };

  const handleCashOut = () => {
    if (!playing) return;

    props.onGameCashOut?.(multiplier);
    setCashOut(multiplier);
    setResult(`Cashed out at ${multiplier.toFixed(2)}x. Profit: $${(wager * multiplier - wager).toFixed(2)}`);
    setPlaying(false);
  };

  return (
    <section className="wow-card">
      <h2 style={{ marginTop: 0 }}>WOW Flight Deck</h2>

      <div className="wow-grid wow-grid-2" style={{ marginBottom: 20 }}>
        <div>
          <div className="wow-label">Current Multiplier</div>
          <div className="wow-hero-glow" style={{ fontSize: 46, fontWeight: 800, color: crashed ? '#ff5d8f' : '#45f8ff' }}>
            {multiplier.toFixed(2)}x
          </div>
        </div>

        <div>
          <div className="wow-label">Hidden Crash Point</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#bb5dff' }}>{crashAt.toFixed(2)}x</div>
        </div>
      </div>

      <div style={{ height: 34, width: '100%', background: '#1a0f31', borderRadius: 999, overflow: 'hidden', marginBottom: 20, border: '1px solid #5d2a99' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: crashed ? 'linear-gradient(90deg, #ff5d8f, #ff9ebf)' : 'linear-gradient(90deg, #45f8ff, #23ffb9)',
            transition: 'width 0.1s linear',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#090313',
            fontWeight: 800,
          }}
        >
          {progress > 12 ? `${progress.toFixed(0)}%` : ''}
        </div>
      </div>

      <div className="wow-grid wow-grid-2" style={{ marginBottom: 20 }}>
        <label className="wow-field">
          <span className="wow-label">Wager ($)</span>
          <input
            className="wow-input"
            type="number"
            value={wager}
            onChange={(e) => setWager(parseFloat(e.target.value) || 0)}
            disabled={playing}
            min={0.1}
            step={0.1}
          />
        </label>

        <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
          <button className="wow-btn wow-btn-primary" onClick={handleStart} disabled={playing} style={{ flex: 1 }}>
            {playing ? 'Round Active' : 'Launch'}
          </button>
          <button className="wow-btn wow-btn-neon" onClick={handleCashOut} disabled={!playing} style={{ flex: 1 }}>
            Cash Out
          </button>
        </div>
      </div>

      {result && (
        <div
          className="wow-status"
          style={{
            color: crashed ? '#ff9fbe' : '#d9ceff',
            borderColor: crashed ? '#ff5d8f' : '#7442b9',
          }}
        >
          {result}
        </div>
      )}

      {cashOut && !crashed && (
        <div style={{ marginTop: 12, fontSize: 14, color: '#b8a9da' }}>
          Payout: ${(wager * cashOut).toFixed(2)}
        </div>
      )}
    </section>
  );
}
