import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InteractionsService } from '../interactions.service';
import { Article } from 'src/news/entities/news-item.entity';
import { TWITTER_QUEUE } from 'src/config/constants';

@Processor(TWITTER_QUEUE)
export class TwitterInteractionsProcessor {
  constructor(private interactionsService: InteractionsService) {}

  @Process()
  processTwitterJobs(job: Job<Article>) {
    return this.interactionsService.processTwitterInteractions(job.data.id);
  }
}
