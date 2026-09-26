import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class UpsertCustomerRequestDto {
  @ApiProperty() @IsString() @Length(3, 120)
  fullName!: string;

  @ApiProperty() @IsEmail()
  email!: string;

  @ApiProperty() @IsString() @Matches(/^3\d{9}$/, { message: 'must be a 10-digit Colombian mobile number' })
  phone!: string;
}