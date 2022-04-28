import { OnQueueCompleted, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InteractionsService } from '../interactions.service';
import {
  AUDIENCE_TIME_QUEUE,
  RECALCULATE_THE_COEFFICIENT_FOR_ARTICLE,
  TWITTER_AUDIENCE_TIME_JOB,
  UKRAINIAN_AUDIENCE_TIME_JOB,
} from 'src/config/constants';
import { Article } from 'src/news/entities/news-item.entity';
import { INTERACTIONS_PROCESSES_LIMIT } from 'src/config/configuration';
import {
  OldTwitterAudiencePayload,
  TwitterAudienceTimePayload,
} from '../types';
import { Interaction } from '../entities/interaction.entity';

@Processor(AUDIENCE_TIME_QUEUE)
export class AudienceTimeProcessor {
  constructor(private interactionsService: InteractionsService) {}

  @OnQueueCompleted()
  onCompleted({ data, name }: Job, result?: Interaction) {
    const { newsItem, repeatedTimes, interactionIndex } = data;
    const repeatedTime = repeatedTimes || interactionIndex;

    if (repeatedTime >= INTERACTIONS_PROCESSES_LIMIT - 1) {
      return;
    }
    if (name === TWITTER_AUDIENCE_TIME_JOB) {
      if (result) {
        const payload =
          'articleId' in data
            ? data
            : this.interactionsService.convertOldTwitterAudienceTimePayload(
                data,
              );

        this.interactionsService.enqueueTwitterAudienceTimeMeasuring({
          interactionIndex: payload.interactionIndex + 1,
          articleId: payload.articleId,
          publicationDate: payload.publicationDate,
          previousAudienceTime: result.audienceTime,
        });

        return;
      }

      this.interactionsService.enqueueTwitterAudienceTimeMeasuring(data);
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
  getTwitterAudienceTime(
    job: Job<OldTwitterAudiencePayload | TwitterAudienceTimePayload>,
  ) {
    if ('publicationDate' in job.data) {
      return this.interactionsService.measureInteractionTwitterAudienceTimeByIndex(
        job.data,
      );
    } else {
      const { newsItem, repeatedTimes } = job.data;

      return this.interactionsService.measureArticleTwitterAudienceTime(
        newsItem,
        repeatedTimes,
      );
    }
  }

  @Process(RECALCULATE_THE_COEFFICIENT_FOR_ARTICLE)
  async recalculateArticleCoefficientProcessor(job: Job<{ articleId }>) {
    return this.interactionsService.recalculateArticleCoefficient(
      job.data.articleId,
    );
  }
}
