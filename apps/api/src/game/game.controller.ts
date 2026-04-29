import { Body, Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { GameService } from './game.service';
import { DatabaseService } from './database.service';
import { GameStartDto, GameCashOutDto } from './dto/game.dto';

@Controller('game')
export class GameController {
  constructor(private gameService: GameService, private dbService: DatabaseService) {}

  @Post('start')
  async startGame(@Body() body: GameStartDto, @Req() req: any) {
    const userId = req.headers['x-user-id'] || 'guest';

    if (body.wager < 0.1 || body.wager > 1000) {
      return { error: 'Invalid wager amount' };
    }

    const gameId = `game-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      // Create game in database
      await this.dbService.createGame(userId, body.wager, 0);

      // Start local state
      const state = this.gameService.startGame(gameId, userId, body.wager);

      return {
        game_id: gameId,
        wager: state.wager,
        crash_at: state.crash_at,
        status: 'started'
      };
    } catch (error) {
      return { error: 'Failed to start game' };
    }
  }

  @Post('cashout')
  async cashOut(@Body() body: GameCashOutDto, @Req() req: any) {
    const userId = req.headers['x-user-id'] || 'guest';

    try {
      const { payout, result } = this.gameService.cashOut(body.game_id, body.multiplier);

      // Update game in database to result and payout
      await this.dbService.updateGame(body.game_id, {
        cash_out_at: body.multiplier,
        result,
        payout
      });

      // Update user balance
      if (result === 'won') {
        await this.dbService.updateUserBalance(userId, payout - body.wager);
      }

      this.gameService.clearGame(body.game_id);

      return {
        result,
        payout,
        new_balance: 100 // TODO: Fetch from DB
      };
    } catch (error) {
      return { error: 'Cash out failed' };
    }
  }

  @Get('state/:gameId')
  getGameState(@Param('gameId') gameId: string) {
    const state = this.gameService.getGameState(gameId);
    if (!state) {
      return { error: 'Game not found' };
    }
    return state;
  }

  @Get('leaderboard')
  async getLeaderboard() {
    const leaderboard = await this.dbService.getLeaderboard(100);
    return { leaderboard };
  }

  @Get('stats/:userId')
  async getUserStats(@Param('userId') userId: string) {
    const stats = await this.dbService.getUserStats(userId);
    if (!stats) {
      return { error: 'User not found' };
    }
    return stats;
  }
}
