import {
  OnQueueActive,
  OnQueueCompleted,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InteractionsService } from '../interactions.service';
import { FACEBOOK_QUEUE } from 'src/config/constants';
import { NewsItem } from 'src/news/entities/news-item.entity';

@Processor(FACEBOOK_QUEUE)
export class FacebookInteractionsProcessor {
  private readonly logger = new Logger(FacebookInteractionsProcessor.name);

  constructor(private interactionsService: InteractionsService) {}

  @OnQueueActive()
  onActive({ id }: Job) {
    this.logger.debug(`Processing job with id: ${id}...`);
  }

  @OnQueueCompleted()
  onCompleted({ id }: Job) {
    this.logger.debug(`Completed job with id: ${id}!`);
  }

  @Process()
  async getInteractions(
    job: Job<{ newsItem: NewsItem; repeatedTimes: number }>,
  ) {
    const { newsItem, repeatedTimes } = job.data;

    await this.interactionsService.processFacebookInteractions(newsItem);

    this.interactionsService.enqueueFacebookInteractionsProcessing({
      newsItem,
      repeatedTimes: repeatedTimes + 1,
    });
  }
}
