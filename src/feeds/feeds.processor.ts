import {
  OnQueueActive,
  OnQueueCompleted,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Feed } from './entities/feed.entity';
import { NewsService } from '../news/news.service';
import { FeedsService } from './feeds.service';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Parser = require('rss-parser');

@Processor('feeds')
export class FeedsProcessor {
  private readonly logger = new Logger(FeedsProcessor.name);
  private readonly parser = new Parser();

  constructor(
    private newsService: NewsService,
    private feedsService: FeedsService,
    private httpService: HttpService,
  ) {}

  @OnQueueActive()
  onActive({ data }: Job) {
    this.logger.debug(`Parsing feed "${data.name}" with url ${data.url}...`);
  }

  @OnQueueCompleted()
  onCompleted({ data }: Job) {
    this.logger.debug(`Parsing completed: ${data.name}`);
  }

  @Process('parse')
  async handleParse(job: Job<Feed>) {
    const { url } = job.data;

    try {
      const feedResponse$ = await this.httpService
        // @ts-expect-error as IDK why it is not documented
        .get(url, { responseType: 'arraybuffer', responseEncoding: 'binary' });
      const feedData = (await lastValueFrom(feedResponse$)).data;
      const parsedFeedData = await this.parser.parseString(feedData);

      this.logger.debug(`Parsed Feed Data For ${job.data.name}`);
      await this.newsService.createIfNotExist(
        parsedFeedData.items,
        job.data.id,
      );
    } catch (e) {
      this.logger.error(e);
    }
  }
}
