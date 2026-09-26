import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../shared/http/result-to-http';
import { GetStockForProductUseCase } from '../../application/get-stock-for-product.use-case';
import { GetStockLevelsUseCase } from '../../application/get-stock-levels.use-case';
import { StockLevelResponseDto } from './dto/stock-level-response.dto';

@ApiTags('stock')
@Controller('stock')
export class StockController {
  constructor(
    private readonly getStockLevels: GetStockLevelsUseCase,
    private readonly getStockForProduct: GetStockForProductUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List stock levels for every product' })
  @ApiOkResponse({ type: [StockLevelResponseDto] })
  async list(): Promise<StockLevelResponseDto[]> {
    return this.getStockLevels.execute();
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get available stock for one product' })
  @ApiOkResponse({ type: Number })
  async getOne(@Param('productId') productId: string): Promise<{ productId: string; availableUnits: number }> {
    const availableUnits = unwrapOrThrow(await this.getStockForProduct.execute(productId));
    return { productId, availableUnits };
  }
}