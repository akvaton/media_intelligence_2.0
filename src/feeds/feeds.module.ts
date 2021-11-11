import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { FeedsService } from './feeds.service';
import { FeedsController } from './feeds.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feed } from './entities/feed.entity';
import { FeedsProcessor } from './feeds.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feed]),
    BullModule.registerQueue({
      name: 'feeds',
    }),
  ],
  controllers: [FeedsController],
  providers: [FeedsService, FeedsProcessor],
})
export class FeedsModule {}
