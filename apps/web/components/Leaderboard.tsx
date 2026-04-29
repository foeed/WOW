import { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types';
import { getLeaderboard } from '../lib/api';

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLeaderboard();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="wow-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Top 10 Pilots</h2>
        <button className="wow-btn wow-btn-secondary" onClick={fetchLeaderboard} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="wow-message wow-message-error">{error}</div>}

      {leaderboard.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#b8a9da', padding: 40 }}>
          No leaderboard data yet. Be the first to play!
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="wow-table" style={{ fontSize: 14 }}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th style={{ textAlign: 'right' }}>Games</th>
                <th style={{ textAlign: 'right' }}>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.slice(0, 10).map((entry, idx) => {
                const medal = idx === 0 ? '??' : idx === 1 ? '??' : idx === 2 ? '??' : String(entry.rank);
                return (
                  <tr key={entry.id}>
                    <td style={{ color: idx === 0 ? '#ffd700' : '#c9bae8' }}>{medal}</td>
                    <td>{entry.username || `User ${entry.id.slice(0, 8)}`}</td>
                    <td style={{ textAlign: 'right', color: '#23ffb9', fontWeight: 700 }}>
                      ${entry.balance.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#c9bae8' }}>{entry.games_played}</td>
                    <td style={{ textAlign: 'right', color: '#c9bae8' }}>{entry.win_rate.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
