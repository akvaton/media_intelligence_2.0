import { OnQueueActive, Process, Processor } from '@nestjs/bull';
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
      `Processing job "${name}" with id ${id} and data ${JSON.stringify(
        data,
      )}...`,
    );
  }

  @Process('parse')
  async handleParse(job: Job<NewsItem>) {
    // const { url, name } = job.data;
    this.logger.debug('Start parsing interactions...', job.name);
    await this.interactionsService.processInteractions(job.data);
    this.logger.debug('Parsing completed', job.name);
    // try {
    //   const feed = await axios
    //     // @ts-expect-error as IDK why it is not documented
    //     .get(url, { responseType: 'arraybuffer', responseEncoding: 'binary' });
    //
    //   const feedData = await this.parser.parseString(feed.data);
    //   const source = await this.feedsService.findOne(job.data.id);
    //   feedData.items.forEach((item) => {
    //     this.newsService.createIfNotExist({ ...item, source });
    //   });
    //   await this.logger.debug('Parsing completed', job.name);
    // } catch (e) {
    //   this.logger.error('Error', e);
    // }
  }
}
