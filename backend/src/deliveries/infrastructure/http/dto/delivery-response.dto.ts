import { ApiProperty } from '@nestjs/swagger';

export class DeliveryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() transactionId!: string;
  @ApiProperty() addressLine!: string;
  @ApiProperty() city!: string;
  @ApiProperty() department!: string;
  @ApiProperty({ required: false }) postalCode?: string;
  @ApiProperty() status!: string;
}