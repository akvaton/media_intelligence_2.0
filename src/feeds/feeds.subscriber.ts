import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { Feed } from './entities/feed.entity';
import { CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PARSE_JOB } from '../config/constants';

@EventSubscriber()
export class FeedsSubscriber implements EntitySubscriberInterface<Feed> {
  constructor(
    @InjectQueue('feeds')
    private feedsQueue: Queue,
    connection: Connection,
  ) {
    connection.subscribers.push(this);
  }

  listenTo() {
    return Feed;
  }

  afterInsert(event: InsertEvent<Feed>) {
    return this.feedsQueue.add(PARSE_JOB, event.entity, {
      repeat: { cron: CronExpression.EVERY_10_MINUTES },
      removeOnComplete: true,
      jobId: event.entity.id,
    });
  }
}
