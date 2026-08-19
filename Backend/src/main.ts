import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // Keep GitHub's exact request bytes on req.rawBody. The webhook controller
  // verifies its HMAC against this buffer before it queues the event.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.enableCors();
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend API running on http://localhost:${port}`);
}
bootstrap();
