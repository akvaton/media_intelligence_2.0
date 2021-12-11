import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { FindManyOptions, Repository } from 'typeorm';
import { Queue } from 'bull';
import TwitterApi from 'twitter-api-v2';
import { InjectRepository } from '@nestjs/typeorm';
import { Interaction } from './entities/interaction.entity';
import { NewsItem } from '../news/entities/news-item.entity';
import * as dayjs from 'dayjs';
import { HttpService } from '@nestjs/axios';
import { JSDOM } from 'jsdom';
import {
  INTERACTIONS_PROCESSES_EVERY,
  INTERACTIONS_PROCESSES_LIMIT,
} from 'src/config/configuration';
import { setupCache } from 'axios-cache-adapter';
import { lastValueFrom } from 'rxjs';
import { FACEBOOK_QUEUE, TWITTER_QUEUE } from 'src/config/constants';
import { ObjectID } from 'typeorm/driver/mongodb/typings';
import { FindConditions } from 'typeorm/find-options/FindConditions';

@Injectable()
export class InteractionsService {
  private logger = new Logger(InteractionsService.name);
  private twitterClient = new TwitterApi(process.env.TWITTER_TOKEN).readOnly;
  private cache = setupCache({ maxAge: 60 * 1000 });
  constructor(
    @InjectQueue(FACEBOOK_QUEUE)
    private facebookInteractionsQueue: Queue,
    @InjectQueue(TWITTER_QUEUE)
    private twitterInteractionsQueue: Queue,
    @InjectRepository(Interaction)
    private interactionsRepository: Repository<Interaction>,
    @InjectRepository(NewsItem)
    private newsRepository: Repository<NewsItem>,
    private httpService: HttpService,
  ) {}

  enqueueFacebookInteractionsProcessing({ newsItem, repeatedTimes = 0 }) {
    if (repeatedTimes !== INTERACTIONS_PROCESSES_LIMIT) {
      return this.facebookInteractionsQueue.add(
        { newsItem, repeatedTimes },
        {
          removeOnComplete: true,
          jobId: newsItem.id,
          timeout: 1000 * 5,
          delay: repeatedTimes ? INTERACTIONS_PROCESSES_EVERY : 0,
          attempts: 3,
          backoff: { type: 'fixed', delay: 1000 * 60 },
        },
      );
    } else {
      return this.enqueueTwitterInteractionsProcessing(newsItem);
    }
  }

  getFacebookGraphData(interactions: Array<Interaction>) {
    return interactions.map((item) => {
      const audienceTime = item.audienceTime - interactions[0].audienceTime;
      const lnFacebookInteractions = item.facebookInteractions
        ? Math.log(item.facebookInteractions)
        : 0;
      const lnAudienceTime = audienceTime ? Math.log(audienceTime) : 0;

      return { lnFacebookInteractions, lnAudienceTime };
    });
  }

  getFacebookRegressionCoefficient(
    facebookGraphData: Array<{
      lnFacebookInteractions: number;
      lnAudienceTime: number;
    }>,
  ) {
    const result = facebookGraphData.reduce(
      (accumulator, currentItem) => {
        accumulator.xSum += currentItem.lnAudienceTime;
        accumulator.ySum += currentItem.lnFacebookInteractions;
        accumulator.xySum +=
          currentItem.lnFacebookInteractions * currentItem.lnAudienceTime;
        accumulator.x2Sum += Math.pow(currentItem.lnAudienceTime, 2);
        accumulator.xAverage = accumulator.xSum / facebookGraphData.length;

        return accumulator;
      },
      { xSum: 0, ySum: 0, xySum: 0, x2Sum: 0, xAverage: 0 },
    );
    const { xSum, ySum, xySum, x2Sum, xAverage } = result;

    return (
      ((xSum / xAverage) * xySum - xSum * ySum) /
      ((xSum / xAverage) * x2Sum - Math.pow(xSum, 2))
    );
  }

  public enqueueTwitterInteractionsProcessing(newsItem: NewsItem) {
    return this.twitterInteractionsQueue.add(newsItem);
  }

  public async cancelEnqueuedJobsForNewsItem(newsItemId) {
    const job = await this.facebookInteractionsQueue.getJob(newsItemId);
    const isActive = await job?.isActive();

    if (job && !isActive) {
      await this.interactionsRepository.delete({ articleId: newsItemId });
      return job.remove();
    } else if (job && (await job.finished())) {
      return this.cancelEnqueuedJobsForNewsItem(newsItemId);
    }
  }

  private async getFacebookInteractions(newsItem: NewsItem) {
    try {
      const urlRequest = `https://graph.facebook.com/?id=${newsItem.link}&fields=engagement&access_token=${process.env.FB_TOKEN}`;
      const response = await axios.get(urlRequest);
      const shareCount = response.data.engagement.share_count;

      this.logger.debug(
        `Facebook interactions for ${newsItem.id}: ${shareCount}`,
      );
      return shareCount;
    } catch (e) {
      this.logger.error(`Error while trying to get Facebook shares: ${e}`);
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

  private async getAudienceTime() {
    try {
      const responsePage$ = this.httpService.get<string>(
        'http://top.bigmir.net/',
        {
          responseType: 'text',
          adapter: this.cache.adapter,
        },
      );
      const responseHtml = (await lastValueFrom(responsePage$)).data;
      const dom = new JSDOM(responseHtml);
      const hitsNumber = dom.window.document.querySelector(
        '#container_main > div.page2.g-clearfix > div.doublecol.normal.fr > table:nth-child(3) > tbody > tr:nth-child(18) > td:nth-child(3)',
      ).textContent;

      return parseInt(hitsNumber.replace(/\D/g, ''));
    } catch (e) {
      this.logger.error('Audience time parsing error', e);
      throw e;
    }
  }

  async processTwitterInteractions(newsItem: NewsItem) {
    const [interactions, newsItemEntity] = await Promise.all([
      this.interactionsRepository.find({
        articleId: newsItem.id,
      }),
      this.newsRepository.findOne(newsItem.id),
    ]);
    const timeSlots = interactions.map(({ requestTime }) => requestTime);
    const twitterInteractions = await this.getTwitterInteractions(
      newsItem.link,
      timeSlots,
    );

    interactions.forEach((interaction) => {
      interaction.twitterInteractions =
        twitterInteractions[interaction.requestTime.toISOString()];
    });
    newsItemEntity.twitterInteractions = Math.max(
      ...interactions.map((i) => i.twitterInteractions),
    );

    await Promise.all([
      this.interactionsRepository.save(interactions),
      this.newsRepository.save(newsItemEntity),
    ]);
  }

  async processFacebookInteractions(newsItem: NewsItem) {
    try {
      const dateOfRequest = dayjs(new Date()).startOf('minute').toDate();
      const [facebookInteractions, audienceTime] = await Promise.all([
        this.getFacebookInteractions(newsItem),
        this.getAudienceTime(),
      ]);
      const interaction = new Interaction();

      interaction.requestTime = dateOfRequest;
      interaction.facebookInteractions = facebookInteractions;
      interaction.audienceTime = audienceTime;
      interaction.articleId = newsItem.id;

      await Promise.all([
        this.interactionsRepository.save(interaction).then(() => {
          this.logger.debug(`Interaction saved for ${newsItem.id}`);
        }),
        this.newsRepository
          .update(newsItem.id, {
            facebookInteractions,
          })
          .then(() => {
            this.logger.debug(
              `Facebook interactions updated for ${newsItem.id}`,
            );
          }),
      ]);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  find(options: FindManyOptions<Interaction>) {
    return this.interactionsRepository.find(options);
  }

  delete(
    criteria:
      | string
      | string[]
      | number
      | number[]
      | Date
      | Date[]
      | ObjectID
      | ObjectID[]
      | FindConditions<Interaction>,
  ) {
    return this.interactionsRepository.delete(criteria);
  }
}
