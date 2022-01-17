import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createBullBoard } from '@bull-board/api';
import {
  FACEBOOK_QUEUE,
  TWITTER_QUEUE,
  AUDIENCE_TIME_QUEUE,
  BULL_QUEUES_ROUTE,
} from './config/constants';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const queues = [
    `BullQueue_feeds`,
    `BullQueue_${FACEBOOK_QUEUE}`,
    `BullQueue_${TWITTER_QUEUE}`,
    `BullQueue_${AUDIENCE_TIME_QUEUE}`,
  ];
  const {} = createBullBoard({
    queues: queues.map((queueName) => new BullAdapter(app.get(queueName))),
    serverAdapter,
  });
  serverAdapter.setBasePath(`/${BULL_QUEUES_ROUTE}`);

  app.use(`/${BULL_QUEUES_ROUTE}`, serverAdapter.getRouter());
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 3333);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
