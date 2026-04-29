const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

function apiUrl(path: string): string {
  if (API_BASE) return `${API_BASE}${path}`;
  return path;
}

async function request(path: string, init?: RequestInit) {
  if (!API_BASE) {
    throw new Error('API is not configured. Set NEXT_PUBLIC_API_URL in Vercel environment variables.');
  }

  const response = await fetch(apiUrl(path), init);
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!isJson) {
    throw new Error('API returned non-JSON response. Check NEXT_PUBLIC_API_URL and API deployment status.');
  }

  if (!response.ok || data?.error) {
    const message = data?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export async function startGame(wager: number) {
  return request('/game/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wager }),
  });
}

export async function cashOut(gameId: string, multiplier: number) {
  return request('/game/cashout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_id: gameId, multiplier }),
  });
}

export async function getLeaderboard() {
  return request('/game/leaderboard');
}

export async function getUserStats(userId: string) {
  return request(`/game/stats/${userId}`);
}
