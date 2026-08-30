import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { loadEnv } from '@dailylist/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  // Accepts a comma-separated list, e.g. "http://localhost:3000,http://localhost:3001"
  const corsOrigins = env.API_CORS_ORIGIN.split(',').map((origin) => origin.trim());
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.enableShutdownHooks();

  await app.listen(env.API_PORT);
  // eslint-disable-next-line no-console
  console.log(`Dailylist API listening on http://localhost:${env.API_PORT}`);
}

void bootstrap();
