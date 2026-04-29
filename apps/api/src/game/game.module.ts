import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { DatabaseService } from './database.service';

@Module({
  controllers: [GameController],
  providers: [GameService, DatabaseService],
  exports: [GameService]
})
export class GameModule {}
