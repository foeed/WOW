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
    if (!playing) {
      return;
    }

    const interval = window.setInterval(() => {
      setMultiplier((current) => {
        const next = current + current * 0.015 + 0.02;
        if (next >= crashAt) {
          window.clearInterval(interval);
          setResult('CRASHED! You lost.');
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
      setResult('Wager must be greater than 0');
      return;
    }
    if (props.onGameStart) {
      props.onGameStart(wager);
    }
    setMultiplier(1.0);
    setCrashAt(randomCrashPoint());
    setResult(null);
    setCashOut(null);
    setCrashed(false);
    setPlaying(true);
  };

  const handleCashOut = () => {
    if (!playing) {
      return;
    }
    if (props.onGameCashOut) {
      props.onGameCashOut(multiplier);
    }
    setCashOut(multiplier);
    setResult(`Cashed out at ${multiplier.toFixed(2)}x! Profit: $${(wager * multiplier - wager).toFixed(2)}`);
    setPlaying(false);
  };

  return (
    <section style={{ padding: 24, border: '1px solid #333', borderRadius: 14, marginTop: 20, background: '#10131b' }}>
      <h2 style={{ marginTop: 0 }}>Aviator Rocket</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 14, color: '#999', marginBottom: 6 }}>
            Current Multiplier
          </label>
          <div style={{ fontSize: 32, fontWeight: 700, color: crashed ? '#ff6b6b' : '#15c39a' }}>
            {multiplier.toFixed(2)}x
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 14, color: '#999', marginBottom: 6 }}>
            Crash Point
          </label>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#bbb' }}>
            {crashAt.toFixed(2)}x
          </div>
        </div>
      </div>

      <div style={{ height: 30, width: '100%', background: '#1f2731', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: crashed ? '#ff6b6b' : '#15c39a',
            transition: 'width 0.1s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontWeight: 700,
            fontSize: 12
          }}
        >
          {progress > 10 ? `${progress.toFixed(0)}%` : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 14, color: '#999', marginBottom: 6 }}>
            Wager ($)
          </label>
          <input
            type="number"
            value={wager}
            onChange={(e) => setWager(parseFloat(e.target.value) || 0)}
            disabled={playing}
            min={0.1}
            step={0.1}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: '1px solid #333',
              background: '#0f1724',
              color: '#f4f4f4'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button
            onClick={handleStart}
            disabled={playing}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              color: '#fff',
              background: playing ? '#666' : '#15c39a',
              fontWeight: 700,
              cursor: playing ? 'default' : 'pointer'
            }}
          >
            {playing ? 'Round Active' : 'Start Round'}
          </button>
          <button
            onClick={handleCashOut}
            disabled={!playing}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              color: '#fff',
              background: playing ? '#ff9800' : '#666',
              fontWeight: 700,
              cursor: playing ? 'pointer' : 'default'
            }}
          >
            Cash Out
          </button>
        </div>
      </div>

      {result && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: multiplier >= crashAt ? '#1a1a2e' : '#0d3d1a',
            border: `1px solid ${multiplier >= crashAt ? '#ff6b6b' : '#15c39a'}`,
            color: multiplier >= crashAt ? '#ff6b6b' : '#15c39a',
            fontWeight: 700,
            marginTop: 16
          }}
        >
          {result}
        </div>
      )}

      {cashOut && !crashed && (
        <div style={{ marginTop: 12, fontSize: 14, color: '#bbb' }}>
          Potential Win: ${(wager * cashOut - wager).toFixed(2)} (Payout: ${(wager * cashOut).toFixed(2)})
        </div>
      )}
    </section>
  );
}

