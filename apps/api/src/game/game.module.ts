import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { DatabaseService } from './database.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [GameController],
  providers: [GameService, DatabaseService],
  exports: [GameService],
})
export class GameModule {}
