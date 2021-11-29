import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { LessThan, Repository } from 'typeorm';
import { Queue } from 'bull';
import TwitterApi from 'twitter-api-v2';
import { InjectRepository } from '@nestjs/typeorm';
import { Interaction } from './entities/interaction.entity';
import { InteractionDto } from './dto/interaction.dto';
import { NewsItem } from '../news/entities/news-item.entity';
import * as dayjs from 'dayjs';
import { HttpService } from '@nestjs/axios';
import { JSDOM } from 'jsdom';

import {
  INTERACTIONS_PROCESSES_EVERY,
  INTERACTIONS_PROCESSES_LIMIT,
} from '../config/configuration';

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
  ) {
    // interactionsQueue.getRepeatableJobs().then((jobs) => {
    //   jobs.forEach((job) => {
    //     interactionsQueue.removeRepeatableByKey(job.key);
    //   });
    // });
  }
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
      repeat: {
        every: INTERACTIONS_PROCESSES_EVERY,
        limit: INTERACTIONS_PROCESSES_LIMIT,
      },
      jobId: newsItem.id,
    });
  }

  // Facebook limitation 300 per 1 hour
  private async getFacebookInteractions(url: string) {
    return 0;
    try {
      let facebookShares = 0;
      const urlRequest = `https://graph.facebook.com/?id=${url}&fields=engagement,og_object&access_token=${process.env.FB_TOKEN}`;
      try {
        const response = await this.httpService.get(urlRequest).toPromise();

        facebookShares = response.data.engagement.share_count;
      } catch (error) {
        this.logger.error(error);
      }
      return facebookShares;
    } catch (e) {
      this.logger.error('Error when trying to get Facebook shares', e);
      throw e;
    }
  }

  private async getTwitterInteractions(url: string, timeSlots: Array<Date>) {
    try {
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
      const resultTweets = {};

      timeSlots.forEach(function (d) {
        const startOfMinuteTimeString = d.toISOString();

        resultTweets[startOfMinuteTimeString] =
          resultArray[startOfMinuteTimeString];
      });
      return resultTweets;
    } catch (e) {
      this.logger.error('Error with twitter interactions', e);
      throw e;
    }
  }

  private async getHits() {
    const responsePage = await this.httpService
      .get('http://top.bigmir.net/', {
        responseType: 'text',
      })
      .toPromise();
    const dom = new JSDOM(responsePage.data);

    const hitsNumber = dom.window.document.querySelector(
      '#container_main > div.page2.g-clearfix > div.doublecol.normal.fr > table:nth-child(3) > tbody > tr:nth-child(18) > td:nth-child(2)',
    ).textContent;

    return parseInt(hitsNumber.replace(/\D/g, ''));
  }

  private async getAudienceTime(newsItem: NewsItem, dateOfRequest: Date) {
    // First,  get the latest yesterday's record
    // If it exist, add the latest yesterday's record's count to the parsed one
    // otherwise just put the number to the database as it is
    try {
      const latestInteraction = await this.interactionsRepository.findOne({
        where: {
          articleId: newsItem.id,
          requestTime: LessThan(dayjs(dateOfRequest).startOf('date').toDate()),
        },
        order: { requestTime: 'DESC' },
      });
      const hits = await this.getHits();

      if (latestInteraction) {
        return latestInteraction.audienceTime + hits;
      } else {
        return hits;
      }
    } catch (e) {
      this.logger.error('Audience hits error', e);
      throw e;
    }
  }

  async processTwitterInteractions(newsItem: NewsItem) {
    const interactions = await this.interactionsRepository.find({
      articleId: newsItem.id,
    });
    const timeSlots = interactions.map(({ requestTime }) => requestTime);
    const twitterInteractions = await this.getTwitterInteractions(
      newsItem.link,
      timeSlots,
    );

    interactions.forEach((interaction) => {
      interaction.twitterInteractions =
        twitterInteractions[interaction.requestTime.toISOString()];
      this.interactionsRepository.save(interaction);
    });
  }

  async processInteractions(newsItem: NewsItem) {
    try {
      this.logger.debug(`Processing the item started: ${newsItem.link}`);
      const dateOfRequest = dayjs(new Date()).startOf('minute').toDate();
      const facebookInteractions = await this.getFacebookInteractions(
        newsItem.link,
      );
      const interaction = new Interaction();

      interaction.requestTime = dateOfRequest;
      // interaction.twitterInteractions = twitterCount.meta.total_tweet_count;
      interaction.facebookInteractions = facebookInteractions;

      interaction.audienceTime = await this.getAudienceTime(
        newsItem,
        dateOfRequest,
      );
      interaction.articleId = newsItem.id;
      await this.interactionsRepository.save(interaction);
      this.logger.debug(`Processing the item finished: ${newsItem.link}`);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
