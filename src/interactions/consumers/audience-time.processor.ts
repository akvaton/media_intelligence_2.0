import {
  OnQueueActive,
  OnQueueCompleted,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InteractionsService } from '../interactions.service';
import {
  AUDIENCE_TIME_QUEUE,
  FACEBOOK_QUEUE,
  TWITTER_AUDIENCE_TIME_JOB,
  UKRAINIAN_AUDIENCE_TIME_JOB,
} from 'src/config/constants';
import { Article } from 'src/news/entities/news-item.entity';
import { INTERACTIONS_PROCESSES_LIMIT } from '../../config/configuration';

@Processor(AUDIENCE_TIME_QUEUE)
export class AudienceTimeProcessor {
  private readonly logger = new Logger(AudienceTimeProcessor.name);

  constructor(private interactionsService: InteractionsService) {}

  @OnQueueActive()
  onActive({ id }: Job) {
    this.logger.debug(`Processing job with id: ${id}...`);
  }

  @OnQueueCompleted()
  onCompleted({ id, data, name }: Job) {
    this.logger.debug(`Completed job with id: ${id}!`);

    if (
      name === TWITTER_AUDIENCE_TIME_JOB &&
      data.repeatedTimes !== INTERACTIONS_PROCESSES_LIMIT - 1
    ) {
      const { newsItem, repeatedTimes } = data;

      this.interactionsService.enqueueTwitterAudienceTimeMeasuring({
        newsItem,
        repeatedTimes: repeatedTimes + 1,
      });
    }
  }

  @Process(UKRAINIAN_AUDIENCE_TIME_JOB)
  async getUkrainianAudienceTime(job: Job<{ newsItem: Article }>) {
    const { newsItem } = job.data;

    await this.interactionsService.measureUkrainianAudienceTime(newsItem);
  }

  @Process(TWITTER_AUDIENCE_TIME_JOB)
  async getTwitterAudienceTime(
    job: Job<{ newsItem: Article; repeatedTimes: number }>,
  ) {
    const { newsItem, repeatedTimes } = job.data;

    await this.interactionsService.measureTwitterAudienceTime(
      newsItem,
      repeatedTimes,
    );
  }
}
