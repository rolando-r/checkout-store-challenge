import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../shared/http/result-to-http';
import { GetCheckoutConfigUseCase } from '../../application/get-checkout-config.use-case';
import { CheckoutConfigResponseDto } from './dto/checkout-config-response.dto';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly getCheckoutConfig: GetCheckoutConfigUseCase) {}

  @Get('config')
  @ApiOperation({ summary: 'Get store fees and payment gateway config for checkout' })
  @ApiOkResponse({ type: CheckoutConfigResponseDto })
  async getConfig(): Promise<CheckoutConfigResponseDto> {
    return unwrapOrThrow(await this.getCheckoutConfig.execute());
  }
}