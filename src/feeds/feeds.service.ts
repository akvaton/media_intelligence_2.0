import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { FeedDto } from './dto/feed.dto';
import { Feed } from './entities/feed.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class FeedsService {
  private readonly logger = new Logger(FeedsService.name);
  constructor(
    @InjectRepository(Feed)
    private feedsRepository: Repository<Feed>,
    @InjectQueue('feeds')
    private feedsQueue: Queue,
  ) {
    feedsQueue.getRepeatableJobs().then((jobs) => {
      jobs.forEach((job) => {
        feedsQueue.removeRepeatableByKey(job.key);
      });
    });
  }

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

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkTheFeedsDataBase() {
    const feeds = await this.findAll();

    feeds.forEach((feed) => {
      this.feedsQueue.add('parse', feed, {
        repeat: { cron: CronExpression.EVERY_10_SECONDS },
        jobId: feed.id,
      });
    });
  }
}
