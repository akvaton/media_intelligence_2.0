import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createBullBoard } from 'bull-board';
import { BullAdapter } from 'bull-board/bullAdapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const aQueue = app.get(`BullQueue_feeds`);
  const bQueue = app.get(`BullQueue_interactions`);

  const { router: bullRouter } = createBullBoard([
    new BullAdapter(aQueue),
    new BullAdapter(bQueue),
  ]);

  app.use('/bull-board', bullRouter);
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 3333);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
