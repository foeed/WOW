export async function startGame(wager: number) {
  const response = await fetch('/api/game/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ wager })
  });
  return response.json();
}

export async function cashOut(gameId: string, multiplier: number) {
  const response = await fetch('/api/game/cashout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ game_id: gameId, multiplier })
  });
  return response.json();
}

export async function getLeaderboard() {
  const response = await fetch('/api/game/leaderboard');
  return response.json();
}

export async function getUserStats(userId: string) {
  const response = await fetch(`/api/game/stats/${userId}`);
  return response.json();
}
