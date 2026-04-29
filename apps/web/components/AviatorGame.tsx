import { useEffect, useMemo, useState } from 'react';
import styles from './AviatorGame.module.css';

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

const STAGE_WIDTH = 1000;
const STAGE_HEIGHT = 520;

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

  const chartPoints = useMemo(() => {
    const steps = 42;
    const points: Array<[number, number]> = [];

    for (let i = 0; i <= steps; i += 1) {
      const t = (progress * i) / steps;
      const x = 16 + t * (STAGE_WIDTH - 32);
      const y = STAGE_HEIGHT - 8 - Math.pow(t, 2.15) * (STAGE_HEIGHT * 0.75);
      points.push([x, y]);
    }

    return points;
  }, [progress]);

  const curvePath = useMemo(() => {
    return chartPoints.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  }, [chartPoints]);

  const fillPath = useMemo(() => {
    if (!chartPoints.length) return '';
    const [startX] = chartPoints[0];
    const [endX] = chartPoints[chartPoints.length - 1];
    return `${curvePath} L ${endX} ${STAGE_HEIGHT} L ${startX} ${STAGE_HEIGHT} Z`;
  }, [chartPoints, curvePath]);

  const planePoint = chartPoints[chartPoints.length - 1] || [0, 0];

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
    <section className={styles.aviatorRoot}>
      <div className={styles.historyBar}>
        {history.map((value, idx) => (
          <span key={`${value}-${idx}`} style={{ color: oddColor(value) }} className={styles.historyItem}>
            {formatOdd(value)}
          </span>
        ))}
      </div>

      <div className={styles.layout}>
        <aside className={styles.betsPanel}>
          <div className={styles.betsTabs}>
            <button className={`${styles.tab} ${styles.tabActive}`}>All Bets</button>
            <button className={styles.tab}>Previous</button>
            <button className={styles.tab}>Top</button>
          </div>

          <div className={styles.totalWinBox}>
            <div>
              <div className={styles.muted}>549/588 Bets</div>
            </div>
            <div>
              <div className={styles.totalWin}>502.76</div>
              <div className={styles.muted}>Total win USD</div>
            </div>
          </div>

          <div className={styles.tableHeader}>
            <span>Player</span>
            <span>Bet USD</span>
            <span>X</span>
            <span>Win USD</span>
          </div>

          <div className={styles.rows}>
            {bets.map((row) => (
              <div key={row.id} className={`${styles.row} ${row.win ? styles.rowWin : ''} ${row.mine ? styles.rowMine : ''}`}>
                <span className={styles.playerCol}>
                  <span className={styles.avatar}>{row.player.charAt(0)}</span>
                  {row.player}
                </span>
                <span>{row.bet.toFixed(2)}</span>
                <span>{row.cashout ? formatOdd(row.cashout) : '-'}</span>
                <span>{row.win ? row.win.toFixed(2) : '-'}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className={styles.gamePanel}>
          <div className={styles.modeBar}>FUN MODE</div>

          <div className={styles.stage}>
            <div className={styles.rays} />

            <svg viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`} className={styles.curveSvg} preserveAspectRatio="none">
              <path d={fillPath} className={styles.fillArea} />
              <path d={curvePath} className={styles.curveLine} />

              <g transform={`translate(${planePoint[0]}, ${planePoint[1]}) rotate(-14)`}>
                <path d="M 0 0 L 56 -14 L 44 -2 L 73 0 L 44 2 L 56 14 Z" className={styles.planeBody} />
                <circle cx="74" cy="0" r="7" className={styles.planeProp} />
                <path d="M 74 -8 L 74 8 M 66 0 L 82 0" className={styles.planePropLine} />
              </g>
            </svg>

            <div className={styles.multiplierCenter}>{formatOdd(multiplier)}</div>
          </div>

          <div className={styles.controlBar}>
            <div className={styles.switchRow}>
              <button className={`${styles.modeBtn} ${styles.modeBtnActive}`}>Bet</button>
              <button className={styles.modeBtn}>Auto</button>
            </div>

            <div className={styles.bettingRow}>
              <div className={styles.amountControl}>
                <button onClick={() => setWager((v) => Math.max(0.1, parseFloat((v - 1).toFixed(2))))}>-</button>
                <span>{wager.toFixed(2)}</span>
                <button onClick={() => setWager((v) => parseFloat((v + 1).toFixed(2)))}>+</button>
              </div>

              <div className={styles.quickRow}>
                <button onClick={() => quickBet(1)}>1</button>
                <button onClick={() => quickBet(2)}>2</button>
                <button onClick={() => quickBet(5)}>5</button>
                <button onClick={() => quickBet(10)}>10</button>
              </div>

              <button
                className={`${styles.betButton} ${playing ? styles.betButtonCash : ''}`}
                onClick={playing ? handleCashOut : handleStart}
              >
                <span>{playing ? 'Cash Out' : 'Bet'}</span>
                <strong>{wager.toFixed(2)} USD</strong>
              </button>
            </div>

            <div className={styles.resultText}>{result}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
