import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cashOut as requestCashOut, startGame as requestStartGame } from '../lib/api';
import type { CurveType, RoundPhase } from './R3FGameScene';

interface AviatorGameProps {
  onGameStart?: (wager: number) => void;
  onGameCashOut?: (multiplier: number) => void;
  balance?: number;
}

type RoundState = 'idle' | 'loading' | 'countdown' | 'flying' | 'crashed' | 'cashed_out';
type BetStatus = 'pending' | 'won' | 'lost';
type RoundOutcome = 'win' | 'loss' | null;

interface BetRow {
  id: string;
  roundId: string;
  player: string;
  bet: number;
  targetCashout?: number;
  cashout?: number;
  win?: number;
  mine?: boolean;
  status: BetStatus;
}

interface ActiveRound {
  roundId: string;
  wager: number;
  crashAt: number;
  apiGameId?: string;
}

interface SideFeedRow {
  id: string;
  player: string;
  amount: number;
}

const R3FGameScene = dynamic(() => import('./R3FGameScene').then((mod) => mod.R3FGameScene), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-0 place-items-center bg-slate-950 text-sm text-slate-400">
      Initializing 3D scene...
    </div>
  ),
});

const CRASH_MIN = 1.15;
const CRASH_MAX = 8.5;
const ROUND_LOADING_STEP_MS = 95;
const ROUND_COUNTDOWN_SECONDS = 3;
const TICK_MS = 70;
const MAX_TABLE_ROWS = 16;
const QUICK_BETS = [1, 2, 5, 10];
const AXIS_SECONDS = [0, 3, 6, 9, 12, 15, 18];
const MULTIPLIER_START = 1;
const MULTIPLIER_LINEAR_RATE = 0.035;
const MULTIPLIER_ACCEL_RATE = 0.0047;

const HISTORY_DEFAULT = [
  1.36, 1.0, 1.36, 3.79, 1.67, 1.43, 4.88, 1.29, 2.82, 1.31, 1.3, 3.23,
  5.31, 3.25, 2.13, 7.15, 1.18, 3.72, 1.32, 3.08, 3.11, 2.42, 2.01, 1.0,
  6.78, 1.03, 1.4, 4.78,
];

const BOT_NAMES = [
  'falcon',
  'zenit',
  'pixel',
  'nova',
  'skyfox',
  'atlas',
  'axion',
  'viper',
  'arrow',
  'comet',
  'raven',
  'drift',
];

function formatOdd(value: number): string {
  return `${value.toFixed(2)}x`;
}

function oddColor(value: number): string {
  if (value >= 5) return '#ff38c7';
  if (value >= 2) return '#b45cff';
  return '#58c4ff';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomCrashPoint(): number {
  const random = Math.max(0.0001, Math.random());
  const scaled = 1 + -Math.log(random) * 1.2;
  return parseFloat(clamp(scaled, CRASH_MIN, CRASH_MAX).toFixed(2));
}

function randomBetAmount(): number {
  const chip = [1, 2, 5, 10, 20, 50][Math.floor(Math.random() * 6)];
  return parseFloat((chip * (0.7 + Math.random() * 1.3)).toFixed(2));
}

function randomBotRows(roundId: string): BetRow[] {
  const count = 10 + Math.floor(Math.random() * 8);

  return Array.from({ length: count }, (_, index) => {
    const player = BOT_NAMES[(index + Math.floor(Math.random() * BOT_NAMES.length)) % BOT_NAMES.length];
    const targetCashout = Math.random() > 0.2 ? parseFloat((1.08 + Math.random() * 4.8).toFixed(2)) : undefined;

    return {
      id: `${roundId}-bot-${index}`,
      roundId,
      player: `${player}${1 + Math.floor(Math.random() * 9)}`,
      bet: randomBetAmount(),
      targetCashout,
      status: 'pending',
    };
  });
}

function flightSecondsForMultiplier(targetMultiplier: number): number {
  const a = MULTIPLIER_ACCEL_RATE;
  const b = MULTIPLIER_LINEAR_RATE;
  const c = MULTIPLIER_START - targetMultiplier;
  const discriminant = b * b - 4 * a * c;

  if (discriminant <= 0) {
    return 0;
  }

  const time = (-b + Math.sqrt(discriminant)) / (2 * a);
  return Math.max(0, time);
}

export function AviatorGame(props: AviatorGameProps) {
  const [roundState, setRoundState] = useState<RoundState>('idle');
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashAt, setCrashAt] = useState(2.4);
  const [wager, setWager] = useState(2);
  const [result, setResult] = useState<string>('Place your bet and launch.');
  const [history, setHistory] = useState<number[]>(HISTORY_DEFAULT);
  const [bets, setBets] = useState<BetRow[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [curveType, setCurveType] = useState<CurveType>('bezier');
  const [apiNotice, setApiNotice] = useState('');
  const [activeRoundId, setActiveRoundId] = useState('');
  const [preflightProgress, setPreflightProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [outcome, setOutcome] = useState<RoundOutcome>(null);
  const [sceneEventKey, setSceneEventKey] = useState(0);

  const activeRoundRef = useRef<ActiveRound | null>(null);
  const playerBetIdRef = useRef<string | null>(null);
  const playerCashedOutRef = useRef(false);

  const phase: RoundPhase =
    roundState === 'loading'
      ? 'loading'
      : roundState === 'countdown'
      ? 'countdown'
      : roundState === 'flying'
      ? 'flying'
      : roundState === 'cashed_out'
      ? 'cashed'
      : roundState === 'crashed'
      ? 'crashed'
      : 'idle';

  const playing = roundState === 'loading' || roundState === 'countdown' || roundState === 'flying';
  const canStartRound = roundState === 'idle' || roundState === 'crashed' || roundState === 'cashed_out';

  const progress = useMemo(() => {
    if (roundState === 'idle' || roundState === 'loading' || roundState === 'countdown') {
      return 0.02;
    }

    const denom = Math.max(crashAt - 1, 0.01);
    const raw = (multiplier - 1) / denom;
    return clamp(raw, 0.02, 1);
  }, [multiplier, crashAt, roundState]);

  const roundSummary = useMemo(() => {
    const rows = activeRoundId ? bets.filter((row) => row.roundId === activeRoundId) : [];
    const totalBet = rows.reduce((sum, row) => sum + row.bet, 0);
    const totalWin = rows.reduce((sum, row) => sum + (row.win ?? 0), 0);

    return {
      rowCount: rows.length,
      totalBet: parseFloat(totalBet.toFixed(2)),
      totalWin: parseFloat(totalWin.toFixed(2)),
    };
  }, [activeRoundId, bets]);

  const sideFeed = useMemo<SideFeedRow[]>(() => {
    if (!activeRoundId) {
      return [];
    }

    return bets
      .filter((row) => row.roundId === activeRoundId && row.status === 'won' && !row.mine && row.win)
      .slice(0, 3)
      .map((row) => ({
        id: row.id,
        player: row.player,
        amount: row.win ?? 0,
      }));
  }, [activeRoundId, bets]);

  const yAxisMultipliers = useMemo(() => {
    const top = Math.max(2.6, crashAt, multiplier);
    const marks = [top, top * 0.78, top * 0.57, top * 0.4, top * 0.26, 1];
    return marks.map((value) => formatOdd(Math.max(1, value)));
  }, [crashAt, multiplier]);

  const estimatedFlightSeconds = useMemo(() => {
    const seconds = flightSecondsForMultiplier(crashAt);
    return Math.max(8, Math.min(18, seconds + 1));
  }, [crashAt]);

  const timelineCursorPercent = useMemo(() => {
    return clamp(elapsedSeconds / estimatedFlightSeconds, 0, 1) * 100;
  }, [elapsedSeconds, estimatedFlightSeconds]);

  const settleBotsToMultiplier = useCallback((roundId: string, nextMultiplier: number, crashPoint: number) => {
    setBets((prev) => {
      let changed = false;

      const next = prev.map((row) => {
        if (row.roundId !== roundId || row.mine || row.status !== 'pending') {
          return row;
        }

        if (!row.targetCashout || row.targetCashout >= crashPoint || row.targetCashout > nextMultiplier) {
          return row;
        }

        changed = true;
        const cashout = row.targetCashout;
        const win = parseFloat((row.bet * cashout).toFixed(2));

        return {
          ...row,
          cashout,
          win,
          status: 'won' as BetStatus,
        };
      });

      return changed ? next : prev;
    });
  }, []);

  const finalizeCrash = useCallback((roundId: string, crashPoint: number) => {
    const secured = playerCashedOutRef.current;

    setRoundState('crashed');
    setMultiplier(crashPoint);
    setElapsedSeconds(estimatedFlightSeconds);
    setHistory((prev) => [crashPoint, ...prev].slice(0, 35));

    setBets((prev) => {
      let changed = false;

      const next = prev.map((row) => {
        if (row.roundId !== roundId || row.status !== 'pending') {
          return row;
        }

        changed = true;
        return {
          ...row,
          status: 'lost' as BetStatus,
        };
      });

      return changed ? next : prev;
    });

    setOutcome(secured ? 'win' : 'loss');
    setSceneEventKey((value) => value + 1);

    setResult(
      secured
        ? `Rocket crashed at ${formatOdd(crashPoint)}, but your cashout was already secured.`
        : `Rocket crashed at ${formatOdd(crashPoint)}. You lost this round.`,
    );

    playerCashedOutRef.current = false;
  }, [estimatedFlightSeconds]);

  useEffect(() => {
    if (roundState !== 'loading') {
      return;
    }

    setPreflightProgress(0);

    let missionLoad = 0;
    const timer = window.setInterval(() => {
      missionLoad += 8 + Math.random() * 14;
      const next = Math.min(100, missionLoad);
      setPreflightProgress(next);

      if (next >= 100) {
        window.clearInterval(timer);
        setResult('Fuel loaded. Ignition sequence armed.');
        setRoundState('countdown');
      }
    }, ROUND_LOADING_STEP_MS);

    return () => window.clearInterval(timer);
  }, [roundState]);

  useEffect(() => {
    if (roundState !== 'countdown') {
      return;
    }

    let secondsLeft = ROUND_COUNTDOWN_SECONDS;
    setCountdown(secondsLeft);

    const timer = window.setInterval(() => {
      secondsLeft -= 1;
      setCountdown(Math.max(0, secondsLeft));

      if (secondsLeft <= 0) {
        window.clearInterval(timer);
        setRoundState('flying');
        setResult('Rocket launched. Cash out before explosion.');
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [roundState]);

  useEffect(() => {
    if (roundState !== 'flying') {
      return;
    }

    const startedAt = performance.now();

    const timer = window.setInterval(() => {
      const round = activeRoundRef.current;
      if (!round) {
        return;
      }

      const elapsed = (performance.now() - startedAt) / 1000;
      const nextMultiplier = parseFloat(
        (MULTIPLIER_START + elapsed * MULTIPLIER_LINEAR_RATE + elapsed * elapsed * MULTIPLIER_ACCEL_RATE).toFixed(2),
      );

      setElapsedSeconds(elapsed);
      setMultiplier((current) => (nextMultiplier > current ? nextMultiplier : current));
      settleBotsToMultiplier(round.roundId, nextMultiplier, round.crashAt);

      if (nextMultiplier >= round.crashAt) {
        window.clearInterval(timer);
        finalizeCrash(round.roundId, round.crashAt);
      }
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [finalizeCrash, roundState, settleBotsToMultiplier]);

  useEffect(() => {
    if (roundState === 'idle' || roundState === 'loading' || roundState === 'countdown') {
      setElapsedSeconds(0);
    }
  }, [roundState]);

  const handleStartRound = async () => {
    if (!canStartRound) {
      return;
    }

    if (wager <= 0) {
      setResult('Wager must be greater than 0.');
      return;
    }

    const normalizedWager = parseFloat(wager.toFixed(2));
    const roundId = `round-${Date.now()}`;
    const localCrash = randomCrashPoint();
    const playerBetId = `${roundId}-you`;

    const playerRow: BetRow = {
      id: playerBetId,
      roundId,
      player: 'you',
      bet: normalizedWager,
      mine: true,
      status: 'pending',
    };

    const botRows = randomBotRows(roundId);

    activeRoundRef.current = {
      roundId,
      wager: normalizedWager,
      crashAt: localCrash,
    };

    playerBetIdRef.current = playerBetId;
    playerCashedOutRef.current = false;

    setOutcome(null);
    setActiveRoundId(roundId);
    setCrashAt(localCrash);
    setMultiplier(1);
    setApiNotice('');
    setRoundState('loading');
    setResult('Loading mission systems...');

    setBets((prev) => [playerRow, ...botRows, ...prev].slice(0, MAX_TABLE_ROWS));

    props.onGameStart?.(normalizedWager);

    try {
      const apiRound = await requestStartGame(normalizedWager);

      if (activeRoundRef.current?.roundId !== roundId) {
        return;
      }

      const apiCrashValue = typeof apiRound?.crash_at === 'number' ? apiRound.crash_at : localCrash;
      const syncedCrash = parseFloat(clamp(apiCrashValue, CRASH_MIN, CRASH_MAX).toFixed(2));
      const apiGameId = typeof apiRound?.game_id === 'string' ? apiRound.game_id : undefined;

      activeRoundRef.current = {
        ...(activeRoundRef.current ?? { roundId, wager: normalizedWager, crashAt: syncedCrash }),
        crashAt: syncedCrash,
        apiGameId,
      };

      setCrashAt(syncedCrash);
    } catch {
      setApiNotice('API offline or not configured. Running local simulation mode.');
    }
  };

  const handleCashOut = async () => {
    if (roundState !== 'flying' || playerCashedOutRef.current) {
      return;
    }

    const round = activeRoundRef.current;
    const playerBetId = playerBetIdRef.current;

    if (!round || !playerBetId) {
      return;
    }

    const currentMultiplier = parseFloat(multiplier.toFixed(2));

    if (currentMultiplier >= round.crashAt) {
      finalizeCrash(round.roundId, round.crashAt);
      return;
    }

    const payout = parseFloat((round.wager * currentMultiplier).toFixed(2));
    playerCashedOutRef.current = true;

    setBets((prev) =>
      prev.map((row) => {
        if (row.id !== playerBetId || row.status !== 'pending') {
          return row;
        }

        return {
          ...row,
          cashout: currentMultiplier,
          win: payout,
          status: 'won' as BetStatus,
        };
      }),
    );

    setHistory((prev) => [currentMultiplier, ...prev].slice(0, 35));
    setResult(`Cashout success at ${formatOdd(currentMultiplier)} for ${payout.toFixed(2)} USD.`);
    setRoundState('cashed_out');
    setOutcome('win');
    setSceneEventKey((value) => value + 1);

    props.onGameCashOut?.(currentMultiplier);

    if (!round.apiGameId) {
      return;
    }

    try {
      const apiResult = await requestCashOut(round.apiGameId, currentMultiplier);

      if (apiResult?.result === 'won' && typeof apiResult?.payout === 'number') {
        setResult(`Cashout success at ${formatOdd(currentMultiplier)} for ${apiResult.payout.toFixed(2)} USD.`);
      }
    } catch {
      setApiNotice('Cashout sync failed on API. Local payout still applied.');
    }
  };

  const handleMainButton = () => {
    if (roundState === 'flying') {
      void handleCashOut();
      return;
    }

    if (roundState === 'loading' || roundState === 'countdown') {
      return;
    }

    void handleStartRound();
  };

  const quickBet = (amount: number) => {
    setWager(amount);
  };

  const actionLabel =
    roundState === 'flying'
      ? 'Cash Out'
      : roundState === 'loading'
      ? 'Loading'
      : roundState === 'countdown'
      ? `Launching (${countdown})`
      : 'Start Round';

  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 px-2 py-1.5">
        {history.map((value, idx) => (
          <span key={`${value}-${idx}`} style={{ color: oddColor(value) }} className="whitespace-nowrap text-xs font-bold">
            {formatOdd(value)}
          </span>
        ))}
      </div>

      <div className="grid min-h-0 gap-2 grid-rows-[minmax(160px,0.36fr)_minmax(0,1fr)] sm:grid-rows-[minmax(180px,0.4fr)_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] xl:grid-rows-1">
        <aside className="grid h-full min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-black">
          <div className="grid grid-cols-3 gap-1 p-2">
            <button className="rounded-full border border-slate-700 bg-slate-700/60 px-2 py-1 text-xs font-semibold text-white">All Bets</button>
            <button className="rounded-full border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-300">Round</button>
            <button className="rounded-full border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-300">Live</button>
          </div>

          <div className="mx-2 mb-1.5 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-2">
            <div className="text-xs text-slate-400">{roundSummary.rowCount} Bets</div>
            <div className="text-right">
              <div className="text-xl font-extrabold text-slate-100">{roundSummary.totalWin.toFixed(2)}</div>
              <div className="text-xs text-slate-400">Total win USD</div>
            </div>
          </div>

          <div className="grid grid-cols-[1.3fr_1fr_0.7fr_1fr] gap-1 border-y border-slate-800 px-2 py-1.5 text-[10px] uppercase tracking-wide text-slate-400">
            <span>Player</span>
            <span>Bet USD</span>
            <span>X</span>
            <span>Win USD</span>
          </div>

          <div className="space-y-1 overflow-hidden p-1.5">
            {bets.map((row) => (
              <div
                key={row.id}
                className={`grid grid-cols-[1.3fr_1fr_0.7fr_1fr] items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${
                  row.status === 'won'
                    ? 'border-lime-700 bg-gradient-to-r from-lime-950/80 to-slate-950 text-lime-200'
                    : row.status === 'lost'
                    ? 'border-red-800 bg-gradient-to-r from-red-950/70 to-slate-950 text-rose-200'
                    : row.mine
                    ? 'border-emerald-800 bg-gradient-to-r from-emerald-950/70 to-slate-950 text-emerald-200'
                    : 'border-slate-800 bg-slate-950 text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-rose-900 text-[9px] font-bold text-white">
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

        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between bg-amber-500 px-3 py-1 text-xs font-extrabold tracking-wide text-amber-100 sm:text-sm">
            <span>R3F ROCKET MODE</span>
            <div className="flex gap-1 rounded-full border border-amber-200/40 bg-amber-500/20 p-1 text-[11px]">
              <button
                className={`rounded-full px-3 py-1 ${curveType === 'bezier' ? 'bg-black/35 text-white' : 'text-amber-100/85'}`}
                onClick={() => setCurveType('bezier')}
              >
                Bezier
              </button>
              <button
                className={`rounded-full px-3 py-1 ${curveType === 'catmull' ? 'bg-black/35 text-white' : 'text-amber-100/85'}`}
                onClick={() => setCurveType('catmull')}
              >
                Catmull
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden border-b border-slate-800 bg-[radial-gradient(circle_at_55%_42%,#1e2430_0%,#0b1018_48%,#05070d_90%)]">
            <R3FGameScene
              progress={progress}
              playing={playing}
              curveType={curveType}
              phase={phase}
              eventKey={sceneEventKey}
            />

            <div className="pointer-events-none absolute left-3 top-6 z-20 flex h-[62%] flex-col justify-between text-[11px] font-semibold text-slate-300/80 md:text-xs">
              {yAxisMultipliers.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>

            <div className="pointer-events-none absolute left-1/2 top-[40%] z-20 -translate-x-1/2 -translate-y-1/2 text-4xl font-black text-slate-100 drop-shadow-[0_0_24px_rgba(255,255,255,0.3)] md:text-6xl">
              {formatOdd(multiplier)}
              <div className="mt-1 text-center text-xs font-medium text-slate-300 md:text-sm">Current Payout</div>
            </div>

            {roundState === 'loading' && (
              <div className="pointer-events-none absolute inset-x-0 top-7 z-30 px-5">
                <div className="mx-auto max-w-md rounded-xl border border-slate-500/40 bg-black/50 p-3 backdrop-blur-sm">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>Mission Loading</span>
                    <span>{preflightProgress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="wow-preflight-bar h-full" style={{ width: `${preflightProgress}%` }} />
                  </div>
                </div>
              </div>
            )}

            {roundState === 'countdown' && (
              <div className="pointer-events-none absolute inset-x-0 top-5 z-30 text-center text-xl font-black tracking-wide text-amber-200 drop-shadow-[0_0_14px_rgba(251,191,36,0.45)] md:text-2xl">
                ROCKET LAUNCH IN {countdown}
              </div>
            )}

            {outcome && (
              <div
                className={`pointer-events-none absolute inset-x-0 top-[26%] z-30 mx-auto w-fit rounded-full px-6 py-2 text-sm font-extrabold tracking-[0.08em] ${
                  outcome === 'win' ? 'wow-outcome-banner wow-outcome-win' : 'wow-outcome-banner wow-outcome-loss'
                }`}
              >
                {outcome === 'win' ? 'WIN LOCKED' : 'ROCKET CRASHED'}
              </div>
            )}

            <div className="pointer-events-none absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 space-y-2 md:block">
              {sideFeed.map((row) => (
                <div key={row.id} className="flex items-center gap-2 rounded-full border border-slate-600/70 bg-black/55 px-3 py-1 text-xs text-slate-200 backdrop-blur-sm">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-slate-400/80 text-[9px] font-black text-slate-900">*</span>
                  <span className="font-semibold">{row.player}</span>
                  <span className="text-emerald-300">${row.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-x-6 bottom-2 z-20 sm:inset-x-8 sm:bottom-3">
              <div className="relative h-6">
                <div className="absolute inset-x-0 top-2 h-[2px] bg-slate-600/80" />
                <div className="wow-timeline-cursor absolute top-[3px] h-4 w-4 -translate-x-1/2 rounded-full border border-amber-200 bg-amber-400/90" style={{ left: `${timelineCursorPercent}%` }} />
                {AXIS_SECONDS.map((second) => (
                  <div
                    key={second}
                    className={`absolute top-0 -translate-x-1/2 text-[10px] font-semibold ${
                      second === 15
                        ? 'rounded-md border border-amber-300/70 bg-amber-200/90 px-1 py-[1px] text-slate-900'
                        : 'text-slate-300'
                    }`}
                    style={{ left: `${(second / AXIS_SECONDS[AXIS_SECONDS.length - 1]) * 100}%` }}
                  >
                    {second}s
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-wow-panel p-2.5 sm:p-3">
            <div className="mb-2 flex justify-center gap-2">
              <button className="min-w-[90px] rounded-full border border-slate-700 bg-slate-700 px-3 py-1 text-xs font-bold text-white sm:min-w-[100px] sm:px-4 sm:py-1.5 sm:text-sm">Bet</button>
              <button className="min-w-[90px] rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300 sm:min-w-[100px] sm:px-4 sm:py-1.5 sm:text-sm">Manual</button>
            </div>

            <div className="grid gap-2 md:grid-cols-[auto_auto_minmax(180px,220px)] md:items-center md:justify-center">
              <div className="flex items-center overflow-hidden rounded-full border border-slate-700 bg-slate-950">
                <button
                  onClick={() => setWager((value) => Math.max(0.1, parseFloat((value - 1).toFixed(2))))}
                  className="h-8 w-8 text-base text-slate-200 hover:bg-slate-800 sm:h-10 sm:w-10 sm:text-lg"
                >
                  -
                </button>
                <span className="min-w-[66px] text-center text-sm font-bold text-slate-100 sm:min-w-[76px] sm:text-base">{wager.toFixed(2)}</span>
                <button
                  onClick={() => setWager((value) => parseFloat((value + 1).toFixed(2)))}
                  className="h-8 w-8 text-base text-slate-200 hover:bg-slate-800 sm:h-10 sm:w-10 sm:text-lg"
                >
                  +
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 md:grid-cols-2">
                {QUICK_BETS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => quickBet(amount)}
                    className="rounded-full border border-slate-700 bg-slate-900 py-1 text-xs font-semibold text-slate-300 sm:text-sm"
                  >
                    {amount}
                  </button>
                ))}
              </div>

              <button
                className={`grid gap-1 rounded-2xl border px-6 py-3 text-center ${
                  roundState === 'flying'
                    ? 'border-amber-700 bg-amber-500 text-amber-100'
                    : roundState === 'loading' || roundState === 'countdown'
                    ? 'cursor-not-allowed border-slate-700 bg-slate-700 text-slate-300'
                    : 'border-lime-700 bg-lime-600 text-lime-100'
                }`}
                onClick={handleMainButton}
                disabled={roundState === 'loading' || roundState === 'countdown'}
              >
                <span className="text-xl font-extrabold sm:text-2xl">{actionLabel}</span>
                <strong className="text-2xl font-black sm:text-3xl">{wager.toFixed(2)} USD</strong>
              </button>
            </div>

            <div className="mt-2 text-center text-xs text-slate-400 sm:text-sm">{result}</div>
            {apiNotice && <div className="mt-1 text-center text-xs text-amber-300">{apiNotice}</div>}
            <div className="mt-1 text-center text-xs text-slate-500">Round pool: {roundSummary.totalBet.toFixed(2)} USD</div>
          </div>
        </div>
      </div>
    </section>
  );
}
