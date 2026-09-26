import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class ProcessPaymentRequestDto {
  @ApiProperty() @IsString() cardToken!: string;
  @ApiProperty() @IsString() acceptanceToken!: string;
  @ApiProperty() @IsInt() @Min(1) installments!: number;
}