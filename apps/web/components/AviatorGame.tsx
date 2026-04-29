import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

interface AviatorGameProps {
  onGameStart?: (wager: number) => void;
  onGameCashOut?: (multiplier: number) => void;
  balance?: number;
}

interface BetRow {
  id: string;
  player: string;
  bet: number;
  cashout?: number;
  win?: number;
  mine?: boolean;
}

const R3FGameScene = dynamic(() => import('./R3FGameScene').then((mod) => mod.R3FGameScene), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[420px] place-items-center bg-slate-950 text-sm text-slate-400">
      Initializing 3D scene...
    </div>
  ),
});

const CRASH_MIN = 1.25;
const CRASH_MAX = 6.5;

const BASE_BETS: BetRow[] = [
  { id: '1', player: 'd***8', bet: 100 },
  { id: '2', player: 'd***8', bet: 100 },
  { id: '3', player: 'd***3', bet: 100 },
  { id: '4', player: 'd***3', bet: 100 },
  { id: '5', player: 'd***7', bet: 100 },
  { id: '6', player: 'd***7', bet: 100 },
  { id: '7', player: 'd***2', bet: 100 },
  { id: '8', player: 'd***6', bet: 100 },
  { id: '9', player: 'd***3', bet: 100 },
  { id: '10', player: 'd***3', bet: 100 },
  { id: '11', player: 'd***2', bet: 100 },
  { id: '12', player: 'd***2', bet: 100 },
  { id: '13', player: 'd***1', bet: 100 },
  { id: '14', player: 'd***0', bet: 100 },
  { id: '15', player: 'd***0', bet: 100 },
  { id: '16', player: 'd***1', bet: 100 },
  { id: '17', player: 'd***9', bet: 100 },
  { id: '18', player: 'd***9', bet: 100 },
  { id: '19', player: 'd***2', bet: 100 },
];

const HISTORY_DEFAULT = [
  1.36, 1.0, 1.36, 3.79, 1.67, 1.43, 47.23, 1.29, 2.82, 1.31, 1.3, 3.23,
  55.31, 3.25, 2.13, 7.15, 1.18, 13.72, 1.32, 3.08, 3.11, 7.42, 8.01, 1.0,
  6.78, 1.03, 1.4, 12.78, 2.99, 1.43, 1.0, 1.54,
];

function formatOdd(value: number): string {
  return `${value.toFixed(2)}x`;
}

function oddColor(value: number): string {
  if (value >= 10) return '#ff38c7';
  if (value >= 2) return '#b45cff';
  return '#58c4ff';
}

export function AviatorGame(props: AviatorGameProps) {
  const [playing, setPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashAt, setCrashAt] = useState(CRASH_MAX);
  const [wager, setWager] = useState(2);
  const [result, setResult] = useState<string>('Place your bet and launch.');
  const [history, setHistory] = useState<number[]>(HISTORY_DEFAULT);
  const [bets, setBets] = useState<BetRow[]>(BASE_BETS);

  const randomCrashPoint = () => Math.random() * (CRASH_MAX - CRASH_MIN) + CRASH_MIN;

  const progress = useMemo(() => {
    const raw = (multiplier - 1) / (Math.max(crashAt, 1.01) - 1);
    return Math.max(0.02, Math.min(raw, 1));
  }, [multiplier, crashAt]);

  useEffect(() => {
    if (!playing) return;

    const interval = window.setInterval(() => {
      setMultiplier((current) => {
        const next = current + current * 0.02 + 0.015;

        if (next >= crashAt) {
          window.clearInterval(interval);
          setPlaying(false);
          setResult(`Crashed at ${formatOdd(crashAt)}. Round lost.`);
          setHistory((prev) => [crashAt, ...prev].slice(0, 35));
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

    const nextCrash = randomCrashPoint();
    setCrashAt(nextCrash);
    setMultiplier(1);
    setPlaying(true);
    setResult('Round is live. Cash out before crash.');

    setBets((prev) => {
      const next: BetRow = {
        id: `me-${Date.now()}`,
        player: 'you',
        bet: parseFloat(wager.toFixed(2)),
        mine: true,
      };
      return [next, ...prev].slice(0, 22);
    });
  };

  const handleCashOut = () => {
    if (!playing) return;

    props.onGameCashOut?.(multiplier);
    setPlaying(false);

    const cashout = parseFloat(multiplier.toFixed(2));
    const win = parseFloat((wager * cashout).toFixed(2));

    setHistory((prev) => [cashout, ...prev].slice(0, 35));
    setResult(`Cashed out at ${formatOdd(cashout)} for ${win.toFixed(2)} USD.`);

    setBets((prev) => {
      const [first, ...rest] = prev;
      if (!first?.mine || first.cashout) return prev;
      return [{ ...first, cashout, win }, ...rest];
    });
  };

  const quickBet = (amount: number) => setWager(amount);

  return (
    <section className="space-y-2">
      <div className="flex gap-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
        {history.map((value, idx) => (
          <span key={`${value}-${idx}`} style={{ color: oddColor(value) }} className="whitespace-nowrap text-sm font-bold">
            {formatOdd(value)}
          </span>
        ))}
      </div>

      <div className="grid min-h-[calc(100vh-185px)] gap-2 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="grid h-full min-h-[380px] grid-rows-[auto_auto_auto_1fr] overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-black">
          <div className="grid grid-cols-3 gap-2 p-3">
            <button className="rounded-full border border-slate-700 bg-slate-700/60 px-2 py-2 text-sm font-semibold text-white">All Bets</button>
            <button className="rounded-full border border-slate-800 bg-slate-900 px-2 py-2 text-sm text-slate-300">Previous</button>
            <button className="rounded-full border border-slate-800 bg-slate-900 px-2 py-2 text-sm text-slate-300">Top</button>
          </div>

          <div className="mx-3 mb-2 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="text-xs text-slate-400">549/588 Bets</div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-slate-100">502.76</div>
              <div className="text-xs text-slate-400">Total win USD</div>
            </div>
          </div>

          <div className="grid grid-cols-[1.3fr_1fr_0.7fr_1fr] gap-2 border-y border-slate-800 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-400">
            <span>Player</span>
            <span>Bet USD</span>
            <span>X</span>
            <span>Win USD</span>
          </div>

          <div className="space-y-1 overflow-y-auto p-2">
            {bets.map((row) => (
              <div
                key={row.id}
                className={`grid grid-cols-[1.3fr_1fr_0.7fr_1fr] items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                  row.win
                    ? 'border-lime-700 bg-gradient-to-r from-lime-950/80 to-slate-950 text-lime-200'
                    : row.mine
                    ? 'border-emerald-800 bg-gradient-to-r from-emerald-950/70 to-slate-950 text-emerald-200'
                    : 'border-slate-800 bg-slate-950 text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-rose-900 text-[10px] font-bold text-white">
                    {row.player.charAt(0).toUpperCase()}
                  </span>
                  {row.player}
                </span>
                <span>{row.bet.toFixed(2)}</span>
                <span>{row.cashout ? formatOdd(row.cashout) : '-'}</span>
                <span>{row.win ? row.win.toFixed(2) : '-'}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="grid h-full min-h-[620px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <div className="bg-amber-500 py-1 text-center text-sm font-extrabold tracking-wide text-amber-100">R3F MODE</div>

          <div className="relative overflow-hidden border-b border-slate-800 bg-[radial-gradient(circle_at_55%_42%,#1d5678_0%,#021424_48%,#00050a_90%)]">
            <R3FGameScene progress={progress} playing={playing} curveType="bezier" />

            <div className="pointer-events-none absolute left-1/2 top-[44%] z-20 -translate-x-1/2 -translate-y-1/2 text-5xl font-black text-slate-100 drop-shadow-[0_0_24px_rgba(255,255,255,0.3)] md:text-7xl">
              {formatOdd(multiplier)}
            </div>
          </div>

          <div className="bg-wow-panel p-4">
            <div className="mb-3 flex justify-center gap-2">
              <button className="min-w-[100px] rounded-full border border-slate-700 bg-slate-700 px-4 py-1.5 text-sm font-bold text-white">Bet</button>
              <button className="min-w-[100px] rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-sm font-semibold text-slate-300">Auto</button>
            </div>

            <div className="grid gap-3 md:grid-cols-[auto_auto_minmax(180px,220px)] md:justify-center md:items-center">
              <div className="flex items-center overflow-hidden rounded-full border border-slate-700 bg-slate-950">
                <button
                  onClick={() => setWager((v) => Math.max(0.1, parseFloat((v - 1).toFixed(2))))}
                  className="h-10 w-10 text-lg text-slate-200 hover:bg-slate-800"
                >
                  -
                </button>
                <span className="min-w-[76px] text-center font-bold text-slate-100">{wager.toFixed(2)}</span>
                <button
                  onClick={() => setWager((v) => parseFloat((v + 1).toFixed(2)))}
                  className="h-10 w-10 text-lg text-slate-200 hover:bg-slate-800"
                >
                  +
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 md:grid-cols-2">
                <button onClick={() => quickBet(1)} className="rounded-full border border-slate-700 bg-slate-900 py-1 text-sm font-semibold text-slate-300">1</button>
                <button onClick={() => quickBet(2)} className="rounded-full border border-slate-700 bg-slate-900 py-1 text-sm font-semibold text-slate-300">2</button>
                <button onClick={() => quickBet(5)} className="rounded-full border border-slate-700 bg-slate-900 py-1 text-sm font-semibold text-slate-300">5</button>
                <button onClick={() => quickBet(10)} className="rounded-full border border-slate-700 bg-slate-900 py-1 text-sm font-semibold text-slate-300">10</button>
              </div>

              <button
                className={`grid gap-1 rounded-2xl border px-6 py-3 text-center ${
                  playing
                    ? 'border-amber-700 bg-amber-500 text-amber-100'
                    : 'border-lime-700 bg-lime-600 text-lime-100'
                }`}
                onClick={playing ? handleCashOut : handleStart}
              >
                <span className="text-2xl font-extrabold">{playing ? 'Cash Out' : 'Bet'}</span>
                <strong className="text-3xl font-black">{wager.toFixed(2)} USD</strong>
              </button>
            </div>

            <div className="mt-3 text-center text-sm text-slate-400">{result}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
