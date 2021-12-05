import {
  OnQueueActive,
  OnQueueCompleted,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InteractionsService } from '../interactions.service';
import { NewsItem } from 'src/news/entities/news-item.entity';
import { TWITTER_QUEUE } from 'src/config/constants';

@Processor(TWITTER_QUEUE)
export class TwitterInteractionsProcessor {
  private readonly logger = new Logger(TwitterInteractionsProcessor.name);

  constructor(private interactionsService: InteractionsService) {}

  @OnQueueActive()
  onActive({ id, name }: Job) {
    this.logger.debug(`Processing interactions "${name}" with id ${id}...`);
  }

  @OnQueueCompleted()
  onCompleted({ id, name }: Job) {
    this.logger.debug(`Completed interactions job "${name}" with id ${id}!`);
  }

  @Process()
  processTwitterJobs(job: Job<NewsItem>) {
    // this.logger.debug('Start processing interactions...', job.name);
    return this.interactionsService.processTwitterInteractions(job.data);
  }
}
