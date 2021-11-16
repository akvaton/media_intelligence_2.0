import { OnQueueActive, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Feed } from './entities/feed.entity';
import { NewsService } from '../news/news.service';
import { HttpService } from '@nestjs/axios';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Parser = require('rss-parser');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const iconv = require('iconv-lite');

// TODO: Take a look https://www.npmjs.com/package/fast-xml-parser

axios.interceptors.response.use((response) => {
  const ctype = response.headers['content-type'];

  if (ctype.includes('charset=windows-1251')) {
    response.data = iconv.decode(Buffer.from(response.data), 'windows-1251');
  } else {
    response.data = iconv.decode(Buffer.from(response.data), 'utf-8');
  }
  return response;
});

@Processor('feeds')
export class FeedsProcessor {
  private readonly logger = new Logger(FeedsProcessor.name);
  private readonly parser = new Parser();

  constructor(
    private newsService: NewsService,
    private httpService: HttpService,
  ) {}

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
    // const feed = await this.parser.parseURL(url);

    // this.logger.debug(
    //   'RESULT',
    //   JSON.stringify(
    //     iconv.decode(JSON.stringify(feed), 'windows-1251'),
    //     null,
    //     3,
    //   ),
    // );
    try {
      const feed = await axios
        // @ts-expect-error as IDK why it is not documented
        .get(url, { responseType: 'arraybuffer', responseEncoding: 'binary' });

      console.log(`Feed for ${job.data.name}`);
      const feedData = await this.parser.parseString(feed.data);
      feedData.items.forEach((item) => {
        this.newsService.createIfNotExist({ ...item, source: job.data });
      });
      await this.logger.debug('Parsing completed', job.name);
    } catch (e) {
      this.logger.error('Error', e);
    }
  }
}
