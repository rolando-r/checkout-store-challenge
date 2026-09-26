import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../shared/http/result-to-http';
import { GetDeliveryByTransactionUseCase } from '../../application/get-delivery-by-transaction.use-case';
import { DeliveryResponseDto } from './dto/delivery-response.dto';

@ApiTags('deliveries')
@Controller('transactions/:transactionId/delivery')
export class DeliveriesController {
  constructor(private readonly getDelivery: GetDeliveryByTransactionUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Get the delivery assigned to an approved transaction' })
  @ApiOkResponse({ type: DeliveryResponseDto })
  async getOne(@Param('transactionId') transactionId: string): Promise<DeliveryResponseDto> {
    return unwrapOrThrow(await this.getDelivery.execute(transactionId));
  }
}