import { ApiProperty } from '@nestjs/swagger';

export class StockLevelResponseDto {
  @ApiProperty() productId!: string;
  @ApiProperty() quantity!: number;
}