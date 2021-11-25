import {
  OnQueueActive,
  OnQueueCompleted,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InteractionsService } from './interactions.service';
import { NewsItem } from '../news/entities/news-item.entity';

@Processor('interactions')
export class InteractionsProcessor {
  private readonly logger = new Logger(InteractionsProcessor.name);

  constructor(private interactionsService: InteractionsService) {}

  @OnQueueActive()
  onActive({ id, name, data }: Job) {
    this.logger.debug(
      `Processing interactions "${name}" with id ${id} and data ${JSON.stringify(
        data,
      )}...`,
    );
  }

  @OnQueueCompleted()
  onCompleted({ id, name }: Job) {
    this.logger.debug(`Completed interactions job "${name}" with id ${id}!`);
  }

  @Process('processInteractions')
  async handleParse(job: Job<NewsItem>) {
    console.log('HANDLE processInteractions PARSE');
    this.logger.debug('Start processing interactions...', job.name);
    await this.interactionsService.processInteractions(job.data);
    this.logger.debug('Parsing completed', job.name);
  }
}
