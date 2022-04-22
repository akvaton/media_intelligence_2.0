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
  GENERAL_AUDIENCE_TIME_QUEUE,
} from 'src/config/constants';
import { Article } from '../news/entities/news-item.entity';
import { AudienceTimeProcessor } from './consumers/audience-time.processor';
import { AudienceTime } from './entities/audience-time.entity';
import { GeneralAudienceTimeProcessor } from './consumers/general-audience-time.processor';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Interaction, Article, AudienceTime]),
    BullModule.registerQueue({
      name: AUDIENCE_TIME_QUEUE,
    }),
    BullModule.registerQueue({
      name: GENERAL_AUDIENCE_TIME_QUEUE,
    }),
    BullModule.registerQueue({
      name: FACEBOOK_QUEUE,
      limiter: {
        max: 200,
        duration: 1000 * 60 * 60, // 1 hour
      },
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
    GeneralAudienceTimeProcessor,
  ],
  exports: [InteractionsService],
})
export class InteractionsModule {}
