import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NewsService } from './news.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsItem } from './entities/news-item.entity';
import { InteractionsModule } from '../interactions/interactions.module';
import { NewsSubscriber } from './news.subscriber';
import { FACEBOOK_QUEUE, TWITTER_QUEUE, NEWS_QUEUE } from '../config/constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsItem]),
    BullModule.registerQueue({
      name: NEWS_QUEUE,
    }),
    InteractionsModule,
  ],
  providers: [NewsService, NewsSubscriber],
  exports: [NewsService],
})
export class NewsModule {}
