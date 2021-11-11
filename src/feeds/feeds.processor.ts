import { OnQueueActive, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Feed } from './entities/feed.entity';
const Parser = require('rss-parser');

@Processor('feeds')
export class FeedsProcessor {
  private readonly logger = new Logger(FeedsProcessor.name);
  private readonly parser = new Parser();

  @OnQueueActive()
  onActive(job: Job) {
    console.log(
      `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(
        job.data,
      )}...`,
    );
  }

  @Process('parse')
  async handleParse(job: Job<Feed>) {
    const { url, name } = job.data;
    this.logger.debug('Start parsing...', name);
    const feed = await this.parser.parseURL(url);
    console.log(`Feed for ${job.data.name}`, feed);
    await this.logger.debug('Parsing completed', job.name);
  }
}
