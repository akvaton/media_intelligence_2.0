import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Between, FindManyOptions, Repository } from 'typeorm';
import { Queue } from 'bull';
import TwitterApi from 'twitter-api-v2';
import { InjectRepository } from '@nestjs/typeorm';
import { Interaction } from './entities/interaction.entity';
import { Article } from '../news/entities/news-item.entity';
import * as dayjs from 'dayjs';
import { HttpService } from '@nestjs/axios';
import { JSDOM } from 'jsdom';
import {
  INTERACTIONS_PROCESSES_EVERY,
  INTERACTIONS_PROCESSES_FINISH,
  INTERACTIONS_PROCESSES_LIMIT,
} from 'src/config/configuration';
import { setupCache } from 'axios-cache-adapter';
import { lastValueFrom } from 'rxjs';
import {
  AUDIENCE_TIME_QUEUE,
  BIGMIR_MEDIA_SELECTOR,
  FACEBOOK_QUEUE,
  TWITTER_AUDIENCE_TIME_JOB,
  TWITTER_QUEUE,
  UKRAINIAN_AUDIENCE_TIME_JOB,
} from 'src/config/constants';
import { GraphData, SocialMediaKey } from './dto/interaction.dto';
import { FeedOrigin } from '../feeds/entities/feed.entity';

@Injectable()
export class InteractionsService {
  private logger = new Logger(InteractionsService.name);
  private twitterClient = new TwitterApi(process.env.TWITTER_TOKEN).readOnly;
  private cache = setupCache({ maxAge: 60 * 1000 });

  constructor(
    @InjectQueue(FACEBOOK_QUEUE)
    private facebookInteractionsQueue: Queue<{
      interactionId: number;
    }>,
    @InjectQueue(AUDIENCE_TIME_QUEUE)
    private audienceTimeQueue: Queue,
    @InjectQueue(TWITTER_QUEUE)
    private twitterInteractionsQueue: Queue,
    @InjectRepository(Interaction)
    private interactionsRepository: Repository<Interaction>,
    @InjectRepository(Article)
    private newsRepository: Repository<Article>,
    private httpService: HttpService,
  ) {}

  enqueueFacebookInteractionsProcessing({ interactionId }) {
    return this.facebookInteractionsQueue.add(
      { interactionId },
      {
        removeOnComplete: true,
        jobId: interactionId,
        timeout: 1000 * 10,
        attempts: 3,
        backoff: { type: 'fixed', delay: 5000 * 60 },
      },
    );
  }

  enqueueTwitterInteractionsProcessing(newsItem: Article) {
    const { pubDate, id, link } = newsItem;
    const periodEnd = dayjs(pubDate).add(INTERACTIONS_PROCESSES_FINISH, 'ms');
    const delay = periodEnd.diff(dayjs());

    return this.twitterInteractionsQueue.add(
      { id, link },
      {
        removeOnComplete: true,
        jobId: newsItem.id,
        timeout: 1000 * 10, // 10 seconds
        delay,
        attempts: 7,
        backoff: { type: 'fixed', delay: 1000 * 60 * 15 },
      },
    );
  }

  getGraphData(interactions: Array<Interaction>): GraphData {
    return interactions.map((item, index) => {
      const twitterInteractions =
        item.twitterInteractions ||
        interactions[index - 1]?.twitterInteractions ||
        0;
      const audienceTime = item.audienceTime - interactions[0].audienceTime;
      const facebook =
        item.facebookInteractions > 0 ? Math.log(item.facebookInteractions) : 0;
      const twitter =
        twitterInteractions > 0 ? Math.log(item.twitterInteractions) : 0;

      return {
        facebook,
        audienceTime: audienceTime ? Math.log(audienceTime) : 0,
        twitter,
      };
    });
  }

  getRegressionCoefficient(
    newsItem: Article,
    graphData: GraphData,
    key: SocialMediaKey,
  ) {
    const startIndex = newsItem[`${key}StartIndex`];
    const endIndex = newsItem[`${key}EndIndex`];
    const result = graphData.slice(startIndex, endIndex).reduce(
      (accumulator, currentItem) => {
        accumulator.xSum += currentItem.audienceTime;
        accumulator.ySum += currentItem[key as string];
        accumulator.xySum +=
          currentItem[key as string] * currentItem.audienceTime;
        accumulator.x2Sum += Math.pow(currentItem.audienceTime, 2);
        accumulator.xAverage = accumulator.xSum / graphData.length;

        return accumulator;
      },
      { xSum: 0, ySum: 0, xySum: 0, x2Sum: 0, xAverage: 0 },
    );
    const { xSum, ySum, xySum, x2Sum, xAverage } = result;
    const coefficient =
      ((xSum / xAverage) * xySum - xSum * ySum) /
      ((xSum / xAverage) * x2Sum - Math.pow(xSum, 2));

    return isNaN(coefficient) ? -1 : coefficient;
  }

  private async getFacebookInteractions(newsItem: Article) {
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

  private async getTwitterInteractions(url: string, timeSlots: Array<string>) {
    const fullUrl = `url:"${url}"`;
    const startTime = dayjs(timeSlots[0]).subtract(1, 'm').toISOString();
    const now = dayjs();
    const lastTimeSlot = dayjs(timeSlots[timeSlots.length - 1]);
    const endTime = lastTimeSlot.isAfter(now)
      ? undefined
      : lastTimeSlot.toISOString();
    try {
      let tweetsSum = 0;
      const result = await this.twitterClient.v2.tweetCountRecent(fullUrl, {
        granularity: 'minute',
        start_time: startTime,
        end_time: endTime,
      });
      const resultMap = result.data.reduce((acc, { tweet_count, end }) => {
        acc[end] = tweetsSum += tweet_count;

        return acc;
      }, {});

      return timeSlots.reduce((acc, dateISOString) => {
        acc[dateISOString] = resultMap[dateISOString];

        return acc;
      }, {});
    } catch (e) {
      this.logger.error(
        `${e}, Full url: ${fullUrl}, Start time: ${startTime}, End time: ${endTime}`,
      );
      throw e;
    }
  }

  private async getUkrainianAudienceTime() {
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
        BIGMIR_MEDIA_SELECTOR,
      ).textContent;

      return parseInt(hitsNumber.replace(/\D/g, ''));
    } catch (e) {
      this.logger.error('Audience time parsing error', e);
      throw e;
    }
  }

  async processTwitterInteractions(articleId: number) {
    let interactions = [];
    this.logger.debug(`Looking for article: ${articleId}`);
    const newsItemEntity = await this.newsRepository.findOne(articleId, {
      relations: ['source'],
    });
    this.logger.debug(`Found article: ${articleId}`);
    if (!newsItemEntity) {
      throw new Error('Article not found');
    }

    if (newsItemEntity.source.origin === FeedOrigin.USA) {
      const publicationDate = dayjs(newsItemEntity.pubDate);

      interactions = [...Array(INTERACTIONS_PROCESSES_LIMIT)].map(
        (_, index) => {
          const interaction = new Interaction();

          interaction.requestTime = publicationDate
            .add(INTERACTIONS_PROCESSES_EVERY * index, 'ms')
            .startOf('minute')
            .toDate();
          interaction.articleId = articleId;
          return interaction;
        },
      );
    } else {
      interactions = await this.interactionsRepository.find({
        where: { articleId },
        order: { requestTime: 'ASC' },
      });
    }

    if (!interactions.length) {
      this.logger.warn(`There are no interactions for articleId: ${articleId}`);
      return;
    }

    const timeSlots = interactions.map((i) => i.requestTime.toISOString());
    const twitterInteractions = await this.getTwitterInteractions(
      newsItemEntity.link,
      timeSlots,
    );

    interactions.forEach((interaction, i) => {
      const requestTime = interaction.requestTime.toISOString();

      interaction.twitterInteractions =
        twitterInteractions[requestTime] ||
        interactions[i - 1]?.twitterInteractions ||
        0;
    });

    newsItemEntity.twitterInteractions = Math.max(
      ...interactions.map((i) => i.twitterInteractions),
    );

    await Promise.all([
      this.interactionsRepository.save(interactions).catch((e) => {
        this.logger.error(
          `Saving Interactions failed for articleId ${articleId}!`,
        );
        throw e;
      }),
      this.newsRepository.save(newsItemEntity),
    ]);

    this.logger.debug(`Interactions saved for articleId: ${articleId}`);

    if (newsItemEntity.source.origin === FeedOrigin.USA) {
      await this.enqueueTwitterAudienceTimeMeasuring({
        newsItem: newsItemEntity,
      });
    }
  }

  async processFacebookInteractions(interactionId: number) {
    try {
      const interaction = await this.interactionsRepository.findOne({
        where: { id: interactionId },
        relations: ['article'],
      });
      const { article } = interaction;

      interaction.facebookInteractions = await this.getFacebookInteractions(
        article,
      );
      article.facebookInteractions = interaction.facebookInteractions;
      await Promise.all([
        this.interactionsRepository.save(interaction),
        this.newsRepository.save(article),
      ]);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  find(options: FindManyOptions<Interaction>) {
    return this.interactionsRepository.find(options);
  }

  public enqueueTwitterAudienceTimeMeasuring({ newsItem, repeatedTimes = 0 }) {
    return this.audienceTimeQueue.add(
      TWITTER_AUDIENCE_TIME_JOB,
      { newsItem, repeatedTimes },
      {
        removeOnComplete: true,
        removeOnFail: true,
        jobId: newsItem.id,
        timeout: 1000 * 10,
        delay: repeatedTimes ? INTERACTIONS_PROCESSES_EVERY : 0,
        attempts: 5,
        backoff: { type: 'fixed', delay: 1000 * 60 },
      },
    );
  }

  public enqueueUkrainianAudienceTimeMeasuring({
    newsItem,
    repeatedTimes = 0,
  }) {
    return this.audienceTimeQueue.add(
      UKRAINIAN_AUDIENCE_TIME_JOB,
      { newsItem, repeatedTimes },
      {
        removeOnComplete: true,
        removeOnFail: true,
        jobId: newsItem.id,
        timeout: 1000 * 10,
        delay: repeatedTimes ? INTERACTIONS_PROCESSES_EVERY : 0,
        attempts: 5,
        backoff: { type: 'fixed', delay: 1000 * 60 },
      },
    );
  }

  public async measureUkrainianAudienceTime(article: Article) {
    const requestTime = dayjs(new Date()).startOf('minute').toDate();
    const audienceTime = await this.getUkrainianAudienceTime();
    const interaction = new Interaction();

    interaction.requestTime = requestTime;
    interaction.audienceTime = audienceTime;
    interaction.articleId = article.id;

    const { id } = await this.interactionsRepository.save(interaction);

    return this.enqueueFacebookInteractionsProcessing({
      interactionId: id,
    });
  }

  public async measureTwitterAudienceTime(
    article: Article,
    interactionIndex: number,
  ) {
    try {
      const articleInteractions = await this.interactionsRepository.find({
        where: { articleId: article.id },
        order: { requestTime: 'ASC' },
      });
      const interaction = articleInteractions[interactionIndex];
      const startTime = dayjs(interaction.requestTime)
        .subtract(INTERACTIONS_PROCESSES_EVERY, 'ms')
        .add(1, 'minute')
        .toISOString();
      const inRangeInteractions = await this.interactionsRepository.find({
        where: {
          requestTime: Between(
            startTime,
            dayjs(interaction.requestTime).toISOString(),
          ),
        },
        // relations: ['article', 'article.source'],
      });

      interaction.audienceTime = inRangeInteractions.reduce((acc, curr) => {
        return acc + curr.twitterInteractions;
      }, 0);

      return await this.interactionsRepository.save(interaction);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
