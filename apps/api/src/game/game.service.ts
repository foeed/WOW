import { Injectable } from '@nestjs/common';

const CRASH_MIN = 1.3;
const CRASH_MAX = 5.0;
const HOUSE_EDGE = 0.02; // 2%

export interface GameState {
  id: string;
  user_id: string;
  wager: number;
  crash_at: number;
  started_at: number;
  result: 'pending' | 'won' | 'lost';
  payout: number;
}

@Injectable()
export class GameService {
  private games: Map<string, GameState> = new Map();

  generateCrashPoint(): number {
    // Weighted randomization with house edge
    const random = Math.random();
    const exponential = -Math.log(random) / HOUSE_EDGE;
    return Math.max(CRASH_MIN, Math.min(CRASH_MAX, 1.0 + exponential / 100));
  }

  startGame(gameId: string, userId: string, wager: number): GameState {
    const crashAt = this.generateCrashPoint();
    const state: GameState = {
      id: gameId,
      user_id: userId,
      wager,
      crash_at: parseFloat(crashAt.toFixed(2)),
      started_at: Date.now(),
      result: 'pending',
      payout: 0
    };
    this.games.set(gameId, state);
    return state;
  }

  cashOut(gameId: string, multiplier: number): { payout: number; result: 'won' | 'lost' } {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const roundedMultiplier = parseFloat(multiplier.toFixed(2));

    if (roundedMultiplier >= game.crash_at) {
      game.result = 'lost';
      game.payout = 0;
      return { payout: 0, result: 'lost' };
    }

    const payout = parseFloat((game.wager * roundedMultiplier).toFixed(2));
    game.result = 'won';
    game.payout = payout;
    return { payout, result: 'won' };
  }

  getGameState(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  simulateGameResult(wager: number): { crashed_at: number; won: boolean; payout: number } {
    const crashAt = this.generateCrashPoint();
    // Simulate auto-crash after 15 seconds
    const survived = Math.random() > 0.3;
    const multiplier = survived ? crashAt * 0.95 : crashAt;
    const won = multiplier < crashAt;
    const payout = won ? parseFloat((wager * multiplier).toFixed(2)) : 0;

    return {
      crashed_at: parseFloat(crashAt.toFixed(2)),
      won,
      payout
    };
  }

  clearGame(gameId: string): void {
    this.games.delete(gameId);
  }
}
