import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Headers,
  Inject,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { TRANSACTION_REPOSITORY } from '../../../shared/tokens';
import { TransactionNotFoundError } from '../../../shared/errors/domain-error';
import { unwrapOrThrow } from '../../../shared/http/result-to-http';
import { CreateTransactionUseCase } from '../../application/create-transaction.use-case';
import { ProcessPaymentUseCase } from '../../application/process-payment.use-case';
import type { TransactionRepositoryPort } from '../../domain/ports/transaction.repository.port';
import { CreateTransactionRequestDto } from './dto/create-transaction-request.dto';
import { ProcessPaymentRequestDto } from './dto/process-payment-request.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly processPayment: ProcessPaymentUseCase,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactions: TransactionRepositoryPort,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a PENDING transaction for a product purchase' })
  @ApiOkResponse({ type: TransactionResponseDto })
  async create(
    @Body() dto: CreateTransactionRequestDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TransactionResponseDto> {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const output = unwrapOrThrow(
      await this.createTransaction.execute({ ...dto, idempotencyKey }),
    );
    res.status(output.created ? HttpStatus.CREATED : HttpStatus.OK);
    return TransactionResponseDto.fromDomain(output.transaction);
  }

  @Post(':id/payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Charge a PENDING transaction via the payment gateway' })
  @ApiOkResponse({ type: TransactionResponseDto })
  async pay(
    @Param('id') id: string,
    @Body() dto: ProcessPaymentRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TransactionResponseDto> {
    const output = unwrapOrThrow(
      await this.processPayment.execute({ transactionId: id, ...dto }),
    );
    res.status(output.awaitingGateway ? HttpStatus.ACCEPTED : HttpStatus.OK);
    return TransactionResponseDto.fromDomain(output.transaction);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction, reconciling with the gateway if still pending' })
  @ApiOkResponse({ type: TransactionResponseDto })
  async getOne(@Param('id') id: string): Promise<TransactionResponseDto> {
    const existing = await this.transactions.findById(id);
    if (!existing) throw new TransactionNotFoundError(id);

    if (!existing.isPending() || !existing.gatewayTransactionId) {
      return TransactionResponseDto.fromDomain(existing);
    }

    // Refresh from the gateway using the same settlement machinery as /payment,
    // so a page refresh converges on the same final state.
    const reconciled = unwrapOrThrow(
      await this.processPayment.execute({
        transactionId: id,
        cardToken: '',
        acceptanceToken: '',
        installments: 1,
      }),
    );
    return TransactionResponseDto.fromDomain(reconciled.transaction);
  }
}