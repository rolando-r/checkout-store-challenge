import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../shared/http/result-to-http';
import { GetProductUseCase } from '../../application/get-product.use-case';
import { ListProductsUseCase } from '../../application/list-products.use-case';
import { ProductResponseDto } from './dto/product-response.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly listProducts: ListProductsUseCase,
    private readonly getProduct: GetProductUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all products with available stock' })
  @ApiOkResponse({ type: [ProductResponseDto] })
  async list(): Promise<ProductResponseDto[]> {
    return this.listProducts.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single product with available stock' })
  @ApiOkResponse({ type: ProductResponseDto })
  async getOne(@Param('id') id: string): Promise<ProductResponseDto> {
    return unwrapOrThrow(await this.getProduct.execute(id));
  }
}