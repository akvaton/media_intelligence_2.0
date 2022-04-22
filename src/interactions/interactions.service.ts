import axios from 'axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { FindManyOptions, In, Repository } from 'typeorm';
import { Queue } from 'bull';
import TwitterApi from 'twitter-api-v2';
import { InjectRepository } from '@nestjs/typeorm';
import { Interaction } from './entities/interaction.entity';
import { Article } from '../news/entities/news-item.entity';
import * as dayjs from 'dayjs';
import { HttpService } from '@nestjs/axios';
import { JSDOM } from 'jsdom';
import {
  AUDIENCE_TIME_EVERY_MINUTES,
  INTERACTIONS_PROCESSES_EVERY,
  INTERACTIONS_PROCESSES_FINISH,
  INTERACTIONS_PROCESSES_LIMIT,
} from 'src/config/configuration';
import { setupCache } from 'axios-cache-adapter';
import { lastValueFrom } from 'rxjs';
import {
  AUDIENCE_TIME_QUEUE,
  BIGMIR_MEDIA_SELECTOR,
  ENSURE_ACCUMULATED_INTERACTIONS,
  FACEBOOK_QUEUE,
  TWITTER_AUDIENCE_TIME_JOB,
  TWITTER_QUEUE,
  UKRAINIAN_AUDIENCE_TIME_JOB,
  REGRESSION_MIN_VALUE,
  GENERAL_TWITTER_AUDIENCE_TIME_JOB,
  GENERAL_AUDIENCE_TIME_QUEUE,
} from 'src/config/constants';
import { GraphData, SocialMediaKey } from './dto/interaction.dto';
import { FeedOrigin } from '../feeds/entities/feed.entity';
import { CronExpression } from '@nestjs/schedule';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const regression = require('regression');

import { calculateRegressionCoefficient } from '../utils/regression-coefficient';
import { getChunks } from '../utils/chunks';
import { AudienceTime } from './entities/audience-time.entity';

@Injectable()
export class InteractionsService implements OnModuleInit {
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
    @InjectQueue(GENERAL_AUDIENCE_TIME_QUEUE)
    private generalAudienceTimeQueue: Queue,
    @InjectQueue(TWITTER_QUEUE)
    private twitterInteractionsQueue: Queue,
    @InjectRepository(Interaction)
    private interactionsRepository: Repository<Interaction>,
    @InjectRepository(Article)
    private newsRepository: Repository<Article>,
    @InjectRepository(AudienceTime)
    private audienceTimeRepository: Repository<AudienceTime>,
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
        timeout: 1000 * 60 * 2, // 10 seconds
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
    const startIndex = newsItem[`${key}StartIndex`] - 1;
    const endIndex = newsItem[`${key}EndIndex`];
    const analyzedFragment = graphData
      .slice(startIndex, endIndex)
      .map((item) => ({ x: item.audienceTime, y: item[key as string] }));

    return calculateRegressionCoefficient(analyzedFragment);
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
    const newsItemEntity = await this.newsRepository.findOne(articleId, {
      relations: ['source'],
    });
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
        // removeOnFail: true,
        jobId: newsItem.id,
        timeout: 1000 * 60 * 2, // 2 minutes
        delay: repeatedTimes ? INTERACTIONS_PROCESSES_EVERY : 0,
        attempts: 5,
        backoff: { type: 'fixed', delay: 1000 * 60 * 5 },
        priority: 2,
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
        // removeOnFail: true,
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

  public async measureArticleTwitterAudienceTime(
    article: Article,
    interactionIndex: number,
  ) {
    try {
      const articleInteractions = await this.interactionsRepository
        .find({
          where: { articleId: article.id },
          order: { requestTime: 'ASC' },
        })
        .catch((e) => {
          this.logger.error(`Error for articleInteractions: ${e}`);
          throw e;
        });
      const interaction = articleInteractions[interactionIndex];

      if (interaction.isAccumulated && interaction.audienceTime > 0) {
        return interaction;
      }

      const previousInteractions = articleInteractions.slice(
        0,
        interactionIndex,
      );
      if (!interactionIndex) {
        interaction.audienceTime = 0;
      } else if (
        previousInteractions.length > 1 &&
        previousInteractions.every((interaction) => interaction.isAccumulated)
      ) {
        const previousInteraction = articleInteractions[interactionIndex - 1];
        const [start, end] = [previousInteraction, interaction].map(
          ({ requestTime }) => {
            const rounded =
              Math.round(
                dayjs(requestTime).minute() / AUDIENCE_TIME_EVERY_MINUTES,
              ) * AUDIENCE_TIME_EVERY_MINUTES;

            return dayjs(requestTime)
              .minute(rounded)
              .startOf('minute')
              .toISOString();
          },
        );
        const { sum } = await this.audienceTimeRepository
          .createQueryBuilder('audienceTime')
          .select('SUM(audienceTime.twitterInteractions)', 'sum')
          .where('interaction."Time of request" BETWEEN :start AND :end', {
            start,
            end,
          })
          .getRawOne();

        this.logger.debug({ start, end, sum });
        if (sum > 0) {
          interaction.audienceTime = sum + previousInteraction.audienceTime;
        } else {
          const { sum } = await this.interactionsRepository
            .createQueryBuilder('interaction')
            .select('SUM(interaction.twitterInteractions)', 'sum')
            .where('interaction."Time of request" BETWEEN :start AND :end', {
              start: dayjs(previousInteraction.requestTime).toISOString(),
              end: dayjs(interaction.requestTime).toISOString(),
            })
            .getRawOne();

          interaction.audienceTime = sum + previousInteraction.audienceTime;
        }
      } else {
        const { sum } = await this.interactionsRepository
          .createQueryBuilder('interaction')
          .select('SUM(interaction.twitterInteractions)', 'sum')
          .where('interaction."Time of request" BETWEEN :start AND :end', {
            start: dayjs(article.pubDate).toISOString(),
            end: dayjs(interaction.requestTime).toISOString(),
          })
          .getRawOne();

        interaction.audienceTime = sum;
      }

      interaction.isAccumulated = true;
      return await this.interactionsRepository.save(interaction);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async calculateAudienceTime(interaction: Interaction, article: Article) {
    const { sum } = await this.interactionsRepository
      .createQueryBuilder('interaction')
      .select('SUM(interaction.twitterInteractions)', 'sum')
      .where('interaction."Time of request" BETWEEN :start AND :end', {
        start: dayjs(article.pubDate).toISOString(),
        end: dayjs(interaction.requestTime).toISOString(),
      })
      .getRawOne();

    interaction.audienceTime = sum || 0;
    interaction.isAccumulated = true;

    await this.interactionsRepository.save(interaction);

    return { id: interaction.id, audienceTime: interaction.audienceTime };
  }

  async ensureAccumulatedInteractions() {
    return;
    const articles = await this.newsRepository
      .createQueryBuilder('articles')
      .select('*')
      .where(
        "EXISTS (SELECT * FROM interactions WHERE articleId = articles.id AND isAccumulated = 'False')",
      )
      .andWhere('articles.pubDate < :start', {
        start: dayjs().subtract(96, 'hours').toISOString(),
      })
      .take(5)
      .orderBy({ ['articles.pubDate']: 'ASC' })
      .getRawMany();

    this.logger.debug('Ensure Articles: ', JSON.stringify(articles));

    return Promise.all(
      articles.map((article) =>
        this.recalculateAudienceTimeOnDemand(article.id),
      ),
    );
  }

  onModuleInit() {
    this.recalculateGeneralAudienceTime();
    this.enqueueGeneralAudienceTimeMeasuring();
    // this.audienceTimeQueue.add(
    //   ENSURE_ACCUMULATED_INTERACTIONS,
    //   {},
    //   {
    //     repeat: { cron: CronExpression.EVERY_30_MINUTES },
    //     attempts: 5,
    //     removeOnComplete: true,
    //   },
    // );
  }

  async recalculateAudienceTimeOnDemand(articleId: number) {
    const interactions = await this.interactionsRepository.find({
      where: { articleId },
      order: { requestTime: 'ASC' },
    });
    let accumulator = 0;

    await this.audienceTimeQueue
      .getJob(articleId)
      .then((job) => job?.remove())
      .catch(this.logger.error);

    if (interactions.some((interaction) => interaction.audienceTime < 0)) {
      const article = await this.newsRepository.findOne(articleId);

      return Promise.all(
        interactions.map(
          (interaction) =>
            interaction.audienceTime < 0 &&
            this.calculateAudienceTime(interaction, article),
        ),
      );
    }
    return Promise.all(
      interactions.map((interaction) => {
        if (!interaction.isAccumulated) {
          accumulator += interaction.audienceTime;
          interaction.audienceTime = accumulator;
          interaction.isAccumulated = true;

          return this.interactionsRepository.save(interaction);
        } else {
          accumulator = interaction.audienceTime;
          return interaction;
        }
      }),
    );
  }

  async twitterInteractionsOnDemand(articleId) {
    await this.interactionsRepository.delete({ articleId });
    return this.processTwitterInteractions(articleId);
  }

  async recalculateArticleCoefficient(articleId) {
    const article = await this.newsRepository.findOne(articleId);

    return article.save();
  }

  async calculateBestTwitterRegressionOption(articleIds: Array<string>) {
    const articles = await this.newsRepository.find({
      where: { id: In(articleIds.map((item) => Number(item))) },
      relations: ['interactions'],
    });

    return Promise.all(
      articles.map(async (article) => {
        const interactivePotentialData =
          this.getInteractivePotentialData(article);

        if (!interactivePotentialData) {
          article.twitterRegression = -2;
        } else {
          const { regressionCoefficient, start, end } =
            interactivePotentialData;
          article.twitterStartIndex = start + 1;
          article.twitterEndIndex = end;
          article.twitterRegression = regressionCoefficient;
        }

        await article.save();
        return { id: article.id, twitterRegression: article.twitterRegression };
      }),
    );
  }

  private getInteractivePotentialData = (article: Article) => {
    let bestValue = null;
    const stepsVariants = [5, 4];
    const minimumR2Variants = [0.985, 0.97];
    const { interactions } = article;

    for (const r2Variant of minimumR2Variants) {
      if (bestValue) {
        break;
      }

      for (const variant of stepsVariants) {
        if (bestValue) {
          break;
        }

        let delta = 0;
        const normalizedData = interactions.map((interaction, index) => {
          if (
            interaction.audienceTime < interactions[index - 1]?.audienceTime
          ) {
            delta += interactions[index - 1].audienceTime;
          }

          return {
            ...interaction,
            audienceTime: interaction.audienceTime + delta,
          } as Interaction;
        });
        const graphData = this.getGraphData(normalizedData) || [];
        const chunks = getChunks(graphData, variant);

        bestValue = chunks.reduce(
          (result: { regressionCoefficient: number } | null, current) => {
            const analyzedFragment = current.chunk.map(
              ({ audienceTime: x, twitter: y }) => ({ x, y }),
            );
            const { r2 } = regression.linear(
              current.chunk.map(({ audienceTime, twitter }) => [
                audienceTime,
                twitter,
              ]),
              { precision: 4 },
            );
            const regressionCoefficient =
              calculateRegressionCoefficient(analyzedFragment);

            if (
              isNaN(r2) ||
              r2 < r2Variant ||
              regressionCoefficient < REGRESSION_MIN_VALUE ||
              !isFinite(regressionCoefficient)
            ) {
              return result;
            }

            if (
              !result ||
              result.regressionCoefficient < regressionCoefficient
            ) {
              return { ...current, regressionCoefficient };
            }

            return result;
          },
          bestValue,
        );
      }
    }

    return bestValue;
  };

  private enqueueGeneralAudienceTimeMeasuring() {
    return this.generalAudienceTimeQueue.add(
      GENERAL_TWITTER_AUDIENCE_TIME_JOB,
      {},
      {
        repeat: { cron: `0 */${AUDIENCE_TIME_EVERY_MINUTES} * * * *` },
        timeout: 1000 * 60 * 2, // 10 seconds
        attempts: 5,
        removeOnComplete: true,
      },
    );
  }

  async measureGeneralTwitterAudienceTime(time: Date) {
    try {
      const requestTime = dayjs(time);
      const parameters = {
        start: dayjs(time)
          .subtract(AUDIENCE_TIME_EVERY_MINUTES, 'minutes')
          .toISOString(),
        end: requestTime.toISOString(),
      };
      const { sum } = await this.interactionsRepository
        .createQueryBuilder('interaction')
        .select('SUM(interaction.twitterInteractions)', 'sum')
        .where(
          'interaction."Time of request" BETWEEN :start AND :end',
          parameters,
        )
        .getRawOne();

      this.logger.debug(
        `Measure GeneralTwitterAudienceTime for ${requestTime}: ${sum}`,
      );

      const existingRow = await this.audienceTimeRepository.findOne({
        where: { requestTime: requestTime.toISOString() },
      });

      if (existingRow) {
        return;
      }

      const audienceTime = new AudienceTime();

      audienceTime.requestTime = requestTime.toDate();
      audienceTime.twitterInteractions = sum || 0;

      return audienceTime.save();
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async recalculateGeneralAudienceTime() {
    const startDate = dayjs().startOf('week');
    const firstRow = await this.audienceTimeRepository.findOne({
      order: { requestTime: 'DESC' },
    });
    const endDate = firstRow ? dayjs(firstRow.requestTime) : dayjs();
    const diff = endDate.diff(startDate, 'minutes');
    const arrayLength = Math.floor(diff / AUDIENCE_TIME_EVERY_MINUTES);
    this.logger.debug({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      diff,
      arrayLength,
    });
    const dates = [...Array(arrayLength)].map((_, index) =>
      startDate
        .add(AUDIENCE_TIME_EVERY_MINUTES * index, 'minutes')
        .startOf('minute')
        .toDate(),
    );

    // const existingOnes = await this.audienceTimeRepository.find({
    //   where: { requestTime: In(dates) },
    // });
    // const existingDates = existingOnes.map(({ requestTime }) => requestTime);
    // const nonExistingOnes = dates.filter(
    //   (date) => !existingDates.includes(date),
    // );
    // this.logger.debug({ nonExistingOnes: nonExistingOnes.length });

    return this.generalAudienceTimeQueue.addBulk(
      dates.map((date) => ({
        name: GENERAL_TWITTER_AUDIENCE_TIME_JOB,
        data: { requestTime: date.toISOString() },
        opts: { removeOnComplete: true, attempts: 5 },
      })),
    );
  }
}
