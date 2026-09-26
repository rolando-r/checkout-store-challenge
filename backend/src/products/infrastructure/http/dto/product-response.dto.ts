import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() priceInCents!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() imageUrl!: string;
  @ApiProperty() availableUnits!: number;
}