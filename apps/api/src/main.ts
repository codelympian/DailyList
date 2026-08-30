import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadEnv } from '@dailylist/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: env.API_CORS_ORIGIN, credentials: true });
  app.enableShutdownHooks();

  await app.listen(env.API_PORT);
  // eslint-disable-next-line no-console
  console.log(`Dailylist API listening on http://localhost:${env.API_PORT}`);
}

void bootstrap();
