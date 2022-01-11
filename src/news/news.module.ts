import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NewsService } from './news.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './entities/news-item.entity';
import { InteractionsModule } from '../interactions/interactions.module';
import { NewsSubscriber } from './news.subscriber';
import { NEWS_QUEUE } from '../config/constants';
import { Feed } from '../feeds/entities/feed.entity';
import { NewsController } from './news.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Feed]),
    BullModule.registerQueue({
      name: NEWS_QUEUE,
    }),
    InteractionsModule,
  ],
  providers: [NewsService, NewsSubscriber],
  exports: [NewsService],
  controllers: [NewsController],
})
export class NewsModule {}
