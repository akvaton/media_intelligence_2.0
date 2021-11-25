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
import axios from 'axios';

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
    this.interactionsQueue.add('processInteractions', newsItem, {
      repeat: { cron: CronExpression.EVERY_30_SECONDS, limit: 5 },
      jobId: newsItem.id,
    });
  }

  // Facebook limitation 300 per 1 hour
  private async getFacebookInteractions(url: string) {
    let numbTweets = 0;
    const urlReqest = `https://graph.facebook.com/?id=${url}&fields=engagement,og_object&access_token=${process.env.FB_TOKEN}`;
    try {
      const response = await axios.get(urlReqest);
      numbTweets = response.data.engagement.share_count;
      } catch (error) {
      this.logger.error(error);
      };
    return numbTweets;
  }

  private async getTwitterInteractions(url: string, timeSlots: Array<Date>) {
    const fullUrl = `url:"${url}"`;
    const result =await this.twitterClient.v2.tweetCountRecent(fullUrl, {granularity: 'minute'});
    let resultArray = {};
    let numbTweet = 0;
    result.data.forEach(function numTweets(c) {
      numbTweet  = numbTweet + c.tweet_count;
      resultArray[c.end] = numbTweet;
      });
      let resultTweets = [];
      timeSlots.forEach(function (d) {
        resultTweets.push({ data: d.toString(), number_of_tweets: resultArray[d.toISOString()]});
      });
    return resultTweets;
  }
  async processInteractions(newsItem: NewsItem) {
    try {
      this.logger.debug(`Processing the item started: ${newsItem.link}`);
      const dateOfRequest = new Date();
      const facebookInteractions = await this.getFacebookInteractions(
        newsItem.link,
      );

      const interaction = new Interaction();

      interaction.requestTime = dateOfRequest;
      // interaction.twitterInteractions = twitterCount.meta.total_tweet_count;
      interaction.facebookInteractions = facebookInteractions;
      // interaction.article = newsItem;
      interaction.audienceTime = 10;
      await this.interactionsRepository.save(interaction);
      this.logger.debug(`Processing the item finished: ${newsItem.link}`);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
