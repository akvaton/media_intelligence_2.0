import { OnQueueActive, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Feed } from './entities/feed.entity';
import { NewsService } from '../news/news.service';
// import axios from 'axios';
import { FeedsService } from './feeds.service';
import { HttpService } from '@nestjs/axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Parser = require('rss-parser');
// eslint-disable-next-line @typescript-eslint/no-var-requires
// const iconv = require('iconv-lite');

// TODO: Take a look https://www.npmjs.com/package/fast-xml-parser
// axios.interceptors.response.use((response) => {
//   const ctype = response.headers['content-type'];
//
//   if (ctype.includes('charset=windows-1251')) {
//     response.data = iconv.decode(Buffer.from(response.data), 'windows-1251');
//   } else {
//     response.data = iconv.decode(Buffer.from(response.data), 'utf-8');
//   }
//   return response;
// });

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
  onActive({ id, name, data }: Job) {
    this.logger.debug(
      `Processing job "${name}" with id ${id} and data ${JSON.stringify(
        data,
      )}...`,
    );
  }

  @Process('parse')
  async handleParse(job: Job<Feed>) {
    const { url, name } = job.data;
    this.logger.debug(`Start parsing ${name}...`);

    try {
      const feed = await this.httpService
        // @ts-expect-error as IDK why it is not documented
        .get(url, { responseType: 'arraybuffer', responseEncoding: 'binary' })
        .toPromise();

      const feedData = await this.parser.parseString(feed.data);
      const source = await this.feedsService.findOne(job.data.id);
      feedData.items.forEach((item) => {
        this.newsService.createIfNotExist({ ...item, source });
      });
      this.logger.debug(`Parsing completed:  ${job.data.name}`);
    } catch (e) {
      this.logger.error('Error', e);
    }
  }
}
