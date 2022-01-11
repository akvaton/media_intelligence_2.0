import { Repository } from 'typeorm';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { FeedDto } from './dto/feed.dto';
import { Feed } from './entities/feed.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CHECK_FEEDS, PARSE_JOB } from '../config/constants';
import { INTERACTIONS_PROCESSES_EVERY } from '../config/configuration';

@Injectable()
export class FeedsService implements OnModuleInit {
  constructor(
    @InjectRepository(Feed)
    private feedsRepository: Repository<Feed>,
    @InjectQueue('feeds')
    private feedsQueue: Queue,
  ) {}

  create(createFeedDto: FeedDto) {
    const feed = new Feed();

    feed.name = createFeedDto.name;
    feed.url = createFeedDto.url;
    return this.feedsRepository.save(feed);
  }

  findAll() {
    return this.feedsRepository.find();
  }

  findOne(id: number) {
    return this.feedsRepository.findOne(id);
  }

  update(id: number, updateFeedDto: FeedDto) {
    return this.feedsRepository.update(id, updateFeedDto);
  }

  async remove(id: number) {
    await this.feedsRepository.delete(id);
  }

  enqueueFeedsParsing(feed: Feed) {
    return this.feedsQueue.add(PARSE_JOB, feed, {
      repeat: { cron: CronExpression.EVERY_10_MINUTES },
      removeOnComplete: true,
      jobId: feed.id,
    });
  }

  enqueueFeedsCheck() {
    return this.feedsQueue.add(CHECK_FEEDS, {}, { removeOnComplete: true });
  }

  onModuleInit() {
    setInterval(() => this.enqueueFeedsCheck(), INTERACTIONS_PROCESSES_EVERY);
  }
}
