import { OnQueueCompleted, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InteractionsService } from '../interactions.service';
import {
  AUDIENCE_TIME_QUEUE,
  ENSURE_LOST_INTERACTIONS,
  TWITTER_AUDIENCE_TIME_JOB,
  UKRAINIAN_AUDIENCE_TIME_JOB,
} from 'src/config/constants';
import { Article } from 'src/news/entities/news-item.entity';
import { INTERACTIONS_PROCESSES_LIMIT } from '../../config/configuration';

@Processor(AUDIENCE_TIME_QUEUE)
export class AudienceTimeProcessor {
  constructor(private interactionsService: InteractionsService) {}

  @OnQueueCompleted()
  onCompleted({ data, name }: Job) {
    const { newsItem, repeatedTimes } = data;

    if (repeatedTimes >= INTERACTIONS_PROCESSES_LIMIT - 1) {
      return;
    }
    if (name === TWITTER_AUDIENCE_TIME_JOB) {
      this.interactionsService.enqueueTwitterAudienceTimeMeasuring({
        newsItem,
        repeatedTimes: repeatedTimes + 1,
      });
    } else if (name === UKRAINIAN_AUDIENCE_TIME_JOB) {
      this.interactionsService.enqueueUkrainianAudienceTimeMeasuring({
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

  @Process(ENSURE_LOST_INTERACTIONS)
  async ensureInteractionsProcessor() {
    return this.interactionsService.ensureLostInteractions();
  }
}
