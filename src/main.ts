import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: 'http://localhost:3000' });
  await app.listen(process.env.PORT ?? 3000);
}

const requiredEnvs = [
  'DATABASE_URL',
  'PORT',
  'JWT_SECRET',
  'RESEND_API_KEY',
  'S3_ACCESS_KEY',
  'S3_SECRET_ACCESS',
  'S3_BUCKET_NAME',
  'AWS_REGION',
  'STRIPE_KEY',
];

const missingEnvs = requiredEnvs.filter((env) => !process.env[env]);

if (missingEnvs.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvs.join(', ')}`,
  );
}

bootstrap();
