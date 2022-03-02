import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { Feed } from './entities/feed.entity';
import { NewsService } from '../news/news.service';
import { FeedsService } from './feeds.service';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { CHECK_FEEDS, PARSE_JOB } from '../config/constants';
import axios from 'axios';
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

  @Process(PARSE_JOB)
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
        if (url === 'https://www.buzzfeed.com/politics.xml') {
          this.logger.debug(
            'FEED DATA',
            feedData.replace(/(\r\n|\n|\r)/gm, ''),
          );

          const axiosResponse = await axios.get(
            'https://www.buzzfeed.com/politics.xml',
          );

          this.logger.debug(
            'AXIOS RESPONSE',
            axiosResponse.data.replace(/(\r\n|\n|\r)/gm, ''),
          );
        }

        const parsedFeedData = await this.parser.parseString(
          feedData.replace(/&/g, '&amp;'),
        );

        this.logger.debug(`Parsed Feed Data For ${job.data.name}`);
        await this.newsService.createIfNotExist(
          parsedFeedData.items,
          job.data.id,
        );
      } catch (e) {
        this.logger.error(
          `Parse job failed: ${e}; Data: ${JSON.stringify(job.data)}`,
        );
        throw e;
      }
    }
  }

  @Process(CHECK_FEEDS)
  async s() {
    const feeds = await this.feedsService.findAll();

    await Promise.all(
      feeds.map((feed) => this.feedsService.enqueueFeedsParsing(feed)),
    );
  }
}
