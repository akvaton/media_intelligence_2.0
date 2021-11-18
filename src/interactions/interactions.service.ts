import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import TwitterApi from 'twitter-api-v2';
import { CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Interaction } from './entities/interaction.entity';
import { InteractionDto } from './dto/interaction.dto';
import { NewsItem } from '../news/entities/news-item.entity';

@Injectable()
export class InteractionsService {
  private logger = new Logger(InteractionsService.name);
  private twitterClient = new TwitterApi(process.env.TWITTER_TOKEN).readOnly;
  constructor(
    @InjectQueue('interactions')
    private interactionsQueue: Queue,
    @InjectRepository(Interaction)
    private interactionsRepository: Repository<Interaction>,
  ) {}
  create(interactionDto: InteractionDto) {
    return 'This action adds a new interaction';
  }

  findAll() {
    return `This action returns all interactions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} interaction`;
  }

  update(id: number, interactionDto: InteractionDto) {
    return `This action updates a #${id} interaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} interaction`;
  }

  processNewsItem(newsItem: NewsItem) {
    this.interactionsQueue.add('parse', newsItem, {
      repeat: { cron: CronExpression.EVERY_10_SECONDS, limit: 1 },
      jobId: newsItem.id,
    });
  }

  async processInteractions(newsItem: NewsItem) {
    try {
      this.logger.debug(`Processing the item started: ${newsItem.link}`);
      const dateOfRequest = new Date();

      const twitterCount = await this.twitterClient.v2.tweetCountRecent(
        `url:"${newsItem.link}"`,
      );

      const interaction = new Interaction();

      interaction.requestTime = dateOfRequest;
      interaction.twitterInteractions = twitterCount.meta.total_tweet_count;
      interaction.facebookInteractions = 0;
      interaction.article = newsItem;

      await this.interactionsRepository.save(interaction);
      this.logger.debug(
        `Processing the item finished: ${newsItem.link}, ${twitterCount.meta.total_tweet_count}`,
      );
    } catch (e) {
      this.logger.error(e);
    }
  }
}
