import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { unwrapOrThrow } from '../../../shared/http/result-to-http';
import { UpsertCustomerUseCase } from '../../application/upsert-customer.use-case';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { UpsertCustomerRequestDto } from './dto/upsert-customer-request.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly upsertCustomer: UpsertCustomerUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update a customer by email' })
  @ApiCreatedResponse({ type: CustomerResponseDto })
  @ApiOkResponse({ type: CustomerResponseDto })
  async upsert(
    @Body() dto: UpsertCustomerRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomerResponseDto> {
    const output = unwrapOrThrow(await this.upsertCustomer.execute(dto));
    res.status(output.created ? HttpStatus.CREATED : HttpStatus.OK);
    return output.customer;
  }
}