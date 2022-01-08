import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createBullBoard } from 'bull-board';
import { BullAdapter } from 'bull-board/bullAdapter';
import {
  FACEBOOK_QUEUE,
  TWITTER_QUEUE,
  AUDIENCE_TIME_QUEUE,
} from './config/constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const queues = [
    `BullQueue_feeds`,
    `BullQueue_${FACEBOOK_QUEUE}`,
    `BullQueue_${TWITTER_QUEUE}`,
    `BullQueue_${AUDIENCE_TIME_QUEUE}`,
  ];
  const { router: bullRouter } = createBullBoard(
    queues.map((queueName) => {
      return new BullAdapter(app.get(queueName));
    }),
  );

  app.use('/bull-board', bullRouter);
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 3333);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
