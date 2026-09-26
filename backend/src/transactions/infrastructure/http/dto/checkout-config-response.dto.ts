import { ApiProperty } from '@nestjs/swagger';

class GatewayConfigDto {
  @ApiProperty() publicKey!: string;
  @ApiProperty() acceptanceToken!: string;
}

export class CheckoutConfigResponseDto {
  @ApiProperty() currency!: string;
  @ApiProperty() baseFeeInCents!: number;
  @ApiProperty() deliveryFeeInCents!: number;
  @ApiProperty({ type: GatewayConfigDto }) gateway!: GatewayConfigDto;
}