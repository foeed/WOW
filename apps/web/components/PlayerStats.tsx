import { useEffect, useMemo, useState } from 'react';
import { User } from '../types';
import { getUserStats } from '../lib/api';

interface PlayerStatsProps {
  userId?: string;
  user?: User | null;
}

interface UserGameStats {
  totalGames: number;
  wins: number;
  losses: number;
}

export function PlayerStats(props: PlayerStatsProps) {
  const [stats, setStats] = useState<UserGameStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (props.userId) {
      fetchStats();
    }
  }, [props.userId]);

  const fetchStats = async () => {
    if (!props.userId) return;

    setLoading(true);
    setError('');
    try {
      const data = await getUserStats(props.userId);
      setStats({
        totalGames: data.totalGames ?? 0,
        wins: data.wins ?? 0,
        losses: data.losses ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch your stats.');
    } finally {
      setLoading(false);
    }
  };

  const winRate = useMemo(() => {
    if (!stats || stats.totalGames === 0) return 0;
    return (stats.wins / stats.totalGames) * 100;
  }, [stats]);

  const user = props.user;

  return (
    <section className="wow-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Pilot Stats</h2>
        <button className="wow-btn wow-btn-secondary" onClick={fetchStats} disabled={loading || !props.userId}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="wow-message wow-message-error">{error}</div>}

      <div className="wow-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="wow-status">
          <div className="wow-label">Balance</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#23ffb9' }}>${(user?.balance ?? 0).toFixed(2)}</div>
        </div>

        <div className="wow-status">
          <div className="wow-label">Total Games</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{stats?.totalGames ?? 0}</div>
        </div>

        <div className="wow-status">
          <div className="wow-label">Wins / Losses</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>
            {stats?.wins ?? 0} / {stats?.losses ?? 0}
          </div>
        </div>

        <div className="wow-status">
          <div className="wow-label">Win Rate</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#45f8ff' }}>{winRate.toFixed(1)}%</div>
        </div>

        <div className="wow-status">
          <div className="wow-label">Total Wagered</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#ff7bff' }}>${(user?.total_wagered ?? 0).toFixed(2)}</div>
        </div>

        <div className="wow-status">
          <div className="wow-label">Total Won</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#23ffb9' }}>${(user?.total_won ?? 0).toFixed(2)}</div>
        </div>
      </div>

      {user?.created_at && (
        <div style={{ marginTop: 14, color: '#b8a9da', fontSize: 13 }}>
          Member since {new Date(user.created_at).toLocaleDateString()}
        </div>
      )}
    </section>
  );
}
