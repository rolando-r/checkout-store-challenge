import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min, validateSync } from 'class-validator';

class EnvVars {
  @IsString() @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString() @IsNotEmpty()
  GATEWAY_PUBLIC_KEY!: string;

  @IsString() @IsNotEmpty()
  GATEWAY_PRIVATE_KEY!: string;

  @IsString() @IsNotEmpty()
  GATEWAY_BASE_URL!: string;

  @IsInt() @Min(0)
  BASE_FEE_IN_CENTS!: number;

  @IsInt() @Min(0)
  DELIVERY_FEE_IN_CENTS!: number;

  @IsString() @IsNotEmpty()
  GATEWAY_INTEGRITY_SECRET!: string;
}

/** Fails fast at startup instead of at the first request if config is missing. */
export const validateEnv = (config: Record<string, unknown>) => {
  const validated = plainToInstance(EnvVars, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.toString()}`);
  }
  return validated;
};