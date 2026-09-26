import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { ProductOrmEntity } from '../../products/infrastructure/persistence/product.orm-entity';
import { StockOrmEntity } from '../../stock/infrastructure/persistence/stock.orm-entity';

interface SeedProduct {
  name: string;
  description: string;
  priceInCents: number;
  imageUrl: string;
  quantity: number;
}

const PRODUCTS: SeedProduct[] = [
  {
    name: 'Wireless Headphones',
    description: 'Over-ear Bluetooth headphones with active noise cancellation and 30-hour battery life.',
    priceInCents: 250_000_00,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
    quantity: 15,
  },
  {
    name: 'Mechanical Keyboard',
    description: 'Compact 75% mechanical keyboard with hot-swappable switches and RGB backlighting.',
    priceInCents: 320_000_00,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
    quantity: 8,
  },
  {
    name: 'Portable Bluetooth Speaker',
    description: 'Waterproof speaker with 12 hours of playtime, ideal for outdoor use.',
    priceInCents: 180_000_00,
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1',
    quantity: 20,
  },
  {
    name: 'Smartwatch',
    description: 'Fitness tracker with heart-rate monitoring, GPS, and a week-long battery.',
    priceInCents: 450_000_00,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    quantity: 5,
  },
  {
    name: 'USB-C Hub',
    description: '7-in-1 USB-C hub with HDMI, SD card reader, and 100W power delivery passthrough.',
    priceInCents: 120_000_00,
    imageUrl: 'https://images.unsplash.com/photo-1625948515291-69613efd103f',
    quantity: 30,
  },
];

async function seed() {
  await AppDataSource.initialize();
  console.log('Data source initialized. Seeding products...');

  const productRepo = AppDataSource.getRepository(ProductOrmEntity);
  const stockRepo = AppDataSource.getRepository(StockOrmEntity);

  for (const item of PRODUCTS) {
    const existing = await productRepo.findOneBy({ name: item.name });
    if (existing) {
      console.log(`Skipping "${item.name}" — already seeded.`);
      continue;
    }

    const product = await productRepo.save(
      productRepo.create({
        name: item.name,
        description: item.description,
        priceInCents: String(item.priceInCents),
        currency: 'COP',
        imageUrl: item.imageUrl,
      }),
    );

    await stockRepo.save(stockRepo.create({ productId: product.id, quantity: item.quantity }));

    console.log(`Seeded "${item.name}" with ${item.quantity} units.`);
  }

  console.log('Seeding complete.');
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('Seeding failed', error);
  process.exit(1);
});