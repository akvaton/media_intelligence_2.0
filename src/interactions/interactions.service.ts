import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { LessThan, Repository } from 'typeorm';
import { Queue } from 'bull';
import TwitterApi from 'twitter-api-v2';
import { CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Interaction } from './entities/interaction.entity';
import { InteractionDto } from './dto/interaction.dto';
import { NewsItem } from '../news/entities/news-item.entity';
import * as dayjs from 'dayjs';
import { HttpService } from '@nestjs/axios';
import { parse } from 'node-html-parser';

@Injectable()
export class InteractionsService {
  private logger = new Logger(InteractionsService.name);
  private twitterClient = new TwitterApi(process.env.TWITTER_TOKEN).readOnly;
  constructor(
    @InjectQueue('interactions')
    private interactionsQueue: Queue,
    @InjectRepository(Interaction)
    private interactionsRepository: Repository<Interaction>,
    private httpService: HttpService,
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
      repeat: { cron: CronExpression.EVERY_10_SECONDS, limit: 5 },
      jobId: newsItem.id,
    });
  }

  // Facebook limitation 300 per 1 hour
  private async getFacebookInteractions(url: string) {
    let numbTweets = 0;
    const urlRequest = `https://graph.facebook.com/?id=${url}&fields=engagement,og_object&access_token=${process.env.FB_TOKEN}`;
    try {
      const response = await this.httpService.get(urlRequest).toPromise();
      numbTweets = response.data.engagement.share_count;
    } catch (error) {
      this.logger.error(error);
    }
    return numbTweets;
  }

  private async getTwitterInteractions(url: string, timeSlots: Array<Date>) {
    const fullUrl = `url:"${url}"`;
    const result = await this.twitterClient.v2.tweetCountRecent(fullUrl, {
      granularity: 'minute',
    });
    const resultArray = {};
    let numbTweet = 0;
    result.data.forEach(function numTweets(c) {
      numbTweet = numbTweet + c.tweet_count;
      resultArray[c.end] = numbTweet;
    });
    const resultTweets = [];
    timeSlots.forEach(function (d) {
      resultTweets.push({
        data: d.toString(),
        number_of_tweets: resultArray[d.toISOString()],
      });
    });
    return resultTweets;
  }

  private async getHits() {
    // const responsePage = await this.httpService
    //   .get('http://top.bigmir.net/', {
    //     responseType: 'text',
    //   })
    //   .toPromise();
    // const root = parse(responsePage.data);
    // const value = root.querySelector(
    //   '#container_main > div.page2.g-clearfix > div.doublecol.normal.fr > table:nth-child(3) > tbody > tr:nth-child(18) > td:nth-child(2)',
    // );
    // console.log('RESPONSE VALUE', root, responsePage.data);
    return 0;
  }

  private async getAudienceTime(newsItem: NewsItem, dateOfRequest: Date) {
    // First,  get the latest yesterday's record
    // If it exist, add the latest yesterday's record's count to the parsed one
    // otherwise just put the number to the database as it is

    const latestInteraction = this.interactionsRepository.findOne({
      where: {
        articleId: newsItem.id,
        requestTime: LessThan(dayjs(dateOfRequest).startOf('date').toDate()),
      },
      order: { requestTime: 'DESC' },
    });
    const hits = await this.getHits();
    console.log('LATEST INTERACTIONS', latestInteraction);

    return hits;
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
      interaction.audienceTime = await this.getAudienceTime(
        newsItem,
        dateOfRequest,
      );
      // await this.interactionsRepository.save(interaction);
      this.logger.debug(`Processing the item finished: ${newsItem.link}`);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
