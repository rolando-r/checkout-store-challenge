import { ApiProperty } from '@nestjs/swagger';
import { Transaction } from '../../../domain/transaction.entity';

export class TransactionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() status!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() amounts!: {
    productAmountInCents: number;
    baseFeeInCents: number;
    deliveryFeeInCents: number;
    totalAmountInCents: number;
    currency: string;
  };
  @ApiProperty({ required: false }) card?: { brand: string; last4: string } | null;
  @ApiProperty({ required: false }) statusMessage?: string | null;
  @ApiProperty() createdAt!: Date;

  static fromDomain(transaction: Transaction): TransactionResponseDto {
    const dto = new TransactionResponseDto();
    dto.id = transaction.id;
    dto.reference = transaction.reference;
    dto.status = transaction.status;
    dto.productId = transaction.productId;
    dto.quantity = transaction.quantity;
    dto.amounts = { ...transaction.quote, currency: 'COP' };
    dto.card = transaction.card;
    dto.statusMessage = transaction.statusMessage;
    dto.createdAt = transaction.createdAt;
    return dto;
  }
}