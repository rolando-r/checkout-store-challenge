import { ApiProperty } from '@nestjs/swagger';

export class CustomerResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty() phone!: string;
}