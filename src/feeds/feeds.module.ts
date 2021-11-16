import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { FeedsService } from './feeds.service';
import { FeedsController } from './feeds.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feed } from './entities/feed.entity';
import { FeedsProcessor } from './feeds.processor';
import { NewsModule } from '../news/news.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Feed]),
    BullModule.registerQueue({
      name: 'feeds',
    }),
    NewsModule,
  ],
  controllers: [FeedsController],
  providers: [FeedsService, FeedsProcessor],
})
export class FeedsModule {}
