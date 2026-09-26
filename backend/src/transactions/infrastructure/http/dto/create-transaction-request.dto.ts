import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

class DeliveryAddressDto {
  @ApiProperty() @IsString() addressLine!: string;
  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() department!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() postalCode?: string;
}

export class CreateTransactionRequestDto {
  @ApiProperty() @IsUUID() productId!: string;
  @ApiProperty() @IsUUID() customerId!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(5) quantity!: number;

  @ApiProperty({ type: DeliveryAddressDto })
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress!: DeliveryAddressDto;
}