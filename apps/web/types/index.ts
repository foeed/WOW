export type GameResult = 'won' | 'lost' | 'pending';
export type TransactionType = 'deposit' | 'withdrawal' | 'wager' | 'payout';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface User {
  id: string;
  username: string | null;
  balance: number;
  total_wagered: number;
  total_won: number;
  games_played: number;
  win_rate: number;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  user_id: string;
  wager: number;
  multiplier: number | null;
  crash_at: number;
  cash_out_at: number | null;
  result: GameResult;
  payout: number;
  created_at: string;
  finished_at: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  related_game_id: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string | null;
  balance: number;
  total_wagered: number;
  total_won: number;
  games_played: number;
  win_rate: number;
  rank: number;
}

export interface GameRequest {
  wager: number;
}

export interface GameUpdateRequest {
  multiplier?: number;
  cash_out_at?: number;
  result: GameResult;
  payout?: number;
}

export interface GameResponse {
  id: string;
  wager: number;
  crash_at: number;
  result: GameResult;
  payout: number;
  multiplier?: number;
}
