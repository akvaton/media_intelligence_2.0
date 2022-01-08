import { Module } from '@nestjs/common';
import { InteractionsService } from './interactions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interaction } from './entities/interaction.entity';
import { BullModule } from '@nestjs/bull';
import { TwitterInteractionsProcessor } from './consumers/twitter-interactions.processor';
import { HttpModule } from '@nestjs/axios';
import { FacebookInteractionsProcessor } from './consumers/facebook-interactions.processor';
import {
  TWITTER_QUEUE,
  AUDIENCE_TIME_QUEUE,
  FACEBOOK_QUEUE,
} from 'src/config/constants';
import { Article } from '../news/entities/news-item.entity';
import { AudienceTimeProcessor } from './consumers/audience-time.processor';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Interaction, Article]),
    BullModule.registerQueue({
      name: AUDIENCE_TIME_QUEUE,
    }),
    BullModule.registerQueue({
      name: FACEBOOK_QUEUE,
    }),
    BullModule.registerQueue({
      name: TWITTER_QUEUE,
      limiter: {
        max: 250,
        duration: 1000 * 60 * 15, // 15 minutes
      },
    }),
  ],
  controllers: [],
  providers: [
    InteractionsService,
    TwitterInteractionsProcessor,
    FacebookInteractionsProcessor,
    AudienceTimeProcessor,
  ],
  exports: [InteractionsService],
})
export class InteractionsModule {}
