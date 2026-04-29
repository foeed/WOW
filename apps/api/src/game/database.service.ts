import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface User {
  id: string;
  username: string;
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
  result: 'won' | 'lost' | 'pending';
  payout: number;
  created_at: string;
  finished_at: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'wager' | 'payout';
  status: 'pending' | 'completed' | 'failed';
  related_game_id: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  balance: number;
  total_wagered: number;
  total_won: number;
  games_played: number;
  win_rate: number;
  rank: number;
}

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private supabaseService: SupabaseService) {}

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return JSON.stringify(error);
  }

  async createUser(userId: string, username: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('users')
        .upsert({
          id: userId,
          username,
          balance: 100,
          total_wagered: 0,
          total_won: 0,
          games_played: 0,
          win_rate: 0,
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Error creating user: ${(error as { message?: string }).message || error}`);
        return null;
      }

      return data as User;
    } catch (error) {
      this.logger.error(`Unexpected error creating user: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        this.logger.error(`Error fetching user: ${(error as { message?: string }).message || error}`);
        return null;
      }

      return data as User;
    } catch (error) {
      this.logger.error(`Unexpected error fetching user: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  async updateUserBalance(userId: string, amount: number): Promise<User | null> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .rpc('update_user_balance', { user_id: userId, amount_change: amount });

      if (error) {
        this.logger.error(`Error updating user balance: ${(error as { message?: string }).message || error}`);
        // Fallback to direct update if RPC doesn't exist
        const { data: fallbackData, error: fallbackError } = await this.supabaseService
          .getClient()
          .from('users')
          .update({ balance: amount })
          .eq('id', userId)
          .select()
          .single();

        if (fallbackError) {
          this.logger.error(`Fallback update failed: ${(fallbackError as { message?: string }).message || fallbackError}`);
          return null;
        }

        return fallbackData as User;
      }

      return data as User;
    } catch (error) {
      this.logger.error(`Unexpected error updating user balance: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  async createGame(userId: string, wager: number, crashAt: number): Promise<Game | null> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('games')
        .insert({
          user_id: userId,
          wager,
          crash_at: crashAt,
          result: 'pending',
          payout: 0,
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Error creating game: ${(error as { message?: string }).message || error}`);
        return null;
      }

      return data as Game;
    } catch (error) {
      this.logger.error(`Unexpected error creating game: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  async updateGame(gameId: string, data: Partial<Game>): Promise<Game | null> {
    try {
      const { data: updatedData, error } = await this.supabaseService
        .getClient()
        .from('games')
        .update(data)
        .eq('id', gameId)
        .select()
        .single();

      if (error) {
        this.logger.error(`Error updating game: ${(error as { message?: string }).message || error}`);
        return null;
      }

      return updatedData as Game;
    } catch (error) {
      this.logger.error(`Unexpected error updating game: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('leaderboard')
        .select('*')
        .limit(limit);

      if (error) {
        this.logger.error(`Error fetching leaderboard: ${(error as { message?: string }).message || error}`);
        return [];
      }

      return data as LeaderboardEntry[];
    } catch (error) {
      this.logger.error(`Unexpected error fetching leaderboard: ${this.getErrorMessage(error)}`);
      return [];
    }
  }

  async getUserStats(userId: string): Promise<{ games: Game[]; totalGames: number; wins: number; losses: number } | null> {
    try {
      const { data: games, error } = await this.supabaseService
        .getClient()
        .from('games')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        this.logger.error(`Error fetching user stats: ${(error as { message?: string }).message || error}`);
        return null;
      }

      const totalGames = games.length;
      const wins = games.filter((g) => g.result === 'won').length;
      const losses = games.filter((g) => g.result === 'lost').length;

      return {
        games: games as Game[],
        totalGames,
        wins,
        losses,
      };
    } catch (error) {
      this.logger.error(`Unexpected error fetching user stats: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  async createTransaction(
    userId: string,
    amount: number,
    type: 'deposit' | 'withdrawal' | 'wager' | 'payout',
    relatedGameId?: string,
  ): Promise<Transaction | null> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('transactions')
        .insert({
          user_id: userId,
          amount,
          type,
          status: 'completed',
          related_game_id: relatedGameId || null,
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Error creating transaction: ${(error as { message?: string }).message || error}`);
        return null;
      }

      return data as Transaction;
    } catch (error) {
      this.logger.error(`Unexpected error creating transaction: ${this.getErrorMessage(error)}`);
      return null;
    }
  }
}
