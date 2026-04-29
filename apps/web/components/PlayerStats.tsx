import { useEffect, useState } from 'react';
import { User } from '../types';

interface PlayerStatsProps {
  userId?: string;
  user?: User | null;
}

export function PlayerStats(props: PlayerStatsProps) {
  const [stats, setStats] = useState<User | null>(props.user ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (props.userId) {
      fetchStats();
    }
  }, [props.userId]);

  const fetchStats = async () => {
    if (!props.userId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/game/stats/${props.userId}`);
      const data = await response.json();
      if (data && !data.error) {
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!stats) {
    return null;
  }

  return (
    <section style={{ padding: 24, border: '1px solid #333', borderRadius: 14, marginTop: 20, background: '#10131b' }}>
      <h2 style={{ marginTop: 0 }}>Your Stats</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div style={{ padding: 12, background: '#0f1724', borderRadius: 8, borderLeft: '3px solid #15c39a' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Balance</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#15c39a' }}>
            ${stats.balance.toFixed(2)}
          </div>
        </div>

        <div style={{ padding: 12, background: '#0f1724', borderRadius: 8, borderLeft: '3px solid #2196f3' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Games Played</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#2196f3' }}>
            {stats.games_played}
          </div>
        </div>

        <div style={{ padding: 12, background: '#0f1724', borderRadius: 8, borderLeft: '3px solid #ff9800' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Win Rate</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ff9800' }}>
            {stats.win_rate.toFixed(1)}%
          </div>
        </div>

        <div style={{ padding: 12, background: '#0f1724', borderRadius: 8, borderLeft: '3px solid #f44336' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Total Wagered</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f44336' }}>
            ${stats.total_wagered.toFixed(2)}
          </div>
        </div>

        <div style={{ padding: 12, background: '#0f1724', borderRadius: 8, borderLeft: '3px solid #4caf50' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Total Won</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4caf50' }}>
            ${stats.total_won.toFixed(2)}
          </div>
        </div>

        <div style={{ padding: 12, background: '#0f1724', borderRadius: 8, borderLeft: '3px solid #9c27b0' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Profit/Loss</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: stats.total_won >= stats.total_wagered ? '#4caf50' : '#f44336'
            }}
          >
            ${(stats.total_won - stats.total_wagered).toFixed(2)}
          </div>
        </div>
      </div>

      {stats.created_at && (
        <div style={{ fontSize: 12, color: '#666' }}>
          Member since {new Date(stats.created_at).toLocaleDateString()}
        </div>
      )}
    </section>
  );
}
