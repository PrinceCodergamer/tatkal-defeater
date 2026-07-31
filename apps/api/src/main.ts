import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix('api');

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Tatkal API running on http://localhost:${port}`);
}
bootstrap();
