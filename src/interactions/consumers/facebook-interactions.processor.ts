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
import { Article } from 'src/news/entities/news-item.entity';

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
  async getInteractions(job: Job<{ article: Article; interactionId: number }>) {
    const { article, interactionId } = job.data;

    await this.interactionsService.processFacebookInteractions(
      article,
      interactionId,
    );
  }
}
