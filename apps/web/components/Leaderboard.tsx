import { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types';

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/game/leaderboard');
      const data = await response.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ padding: 24, border: '1px solid #333', borderRadius: 14, marginTop: 20, background: '#10131b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Top 10 Players</h2>
        <button onClick={fetchLeaderboard} disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {leaderboard.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
          No leaderboard data yet. Be the first to play!
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ textAlign: 'left', padding: 12, color: '#999' }}>Rank</th>
                <th style={{ textAlign: 'left', padding: 12, color: '#999' }}>Player</th>
                <th style={{ textAlign: 'right', padding: 12, color: '#999' }}>Balance</th>
                <th style={{ textAlign: 'right', padding: 12, color: '#999' }}>Games</th>
                <th style={{ textAlign: 'right', padding: 12, color: '#999' }}>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.slice(0, 10).map((entry, idx) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: 12, color: idx === 0 ? '#ffd700' : '#bbb' }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : entry.rank}
                  </td>
                  <td style={{ padding: 12, color: '#f4f4f4' }}>
                    {entry.username || `User ${entry.id.slice(0, 8)}`}
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', color: '#15c39a', fontWeight: 700 }}>
                    ${entry.balance.toFixed(2)}
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', color: '#bbb' }}>
                    {entry.games_played}
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', color: '#bbb' }}>
                    {entry.win_rate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
