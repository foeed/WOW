export class GameStartDto {
  wager!: number;
}

export class GameCashOutDto {
  game_id!: string;
  multiplier!: number;
  wager!: number;
}
