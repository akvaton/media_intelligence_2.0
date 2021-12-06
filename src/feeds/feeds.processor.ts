import {
  InjectQueue,
  OnQueueActive,
  OnQueueCompleted,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
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
    @InjectQueue('feeds')
    private feedsQueue: Queue,
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
    const { url, id } = job.data;
    const feed = await this.feedsService.findOne(id);

    if (!feed) {
      this.feedsQueue.getRepeatableJobs().then((repeatableJobs) => {
        const repeatable = repeatableJobs.find((item) => Number(item.id) == id);

        if (repeatable) {
          this.feedsQueue.removeRepeatableByKey(repeatable.key);
        }
      });
    } else {
      try {
        const feedResponse$ = await this.httpService.get(url, {
          responseType: 'arraybuffer',
          // @ts-expect-error as IDK why it is not documented
          responseEncoding: 'binary',
        });
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
}
