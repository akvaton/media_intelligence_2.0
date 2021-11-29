import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NewsItem } from './entities/news-item.entity';
import { InteractionsModule } from '../interactions/interactions.module';
import { NewsSubscriber } from './news.subscriber';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsItem]),
    BullModule.registerQueue({
      name: 'news',
    }),
    InteractionsModule,
  ],
  controllers: [NewsController],
  providers: [NewsService, NewsSubscriber],
  exports: [NewsService],
})
export class NewsModule {}
