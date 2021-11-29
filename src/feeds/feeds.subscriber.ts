import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { Feed } from './entities/feed.entity';
import { InteractionsService } from '../interactions/interactions.service';
import { CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

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
    this.feedsQueue.add('parse', event.entity, {
      repeat: { cron: CronExpression.EVERY_30_SECONDS },
      jobId: event.entity.id,
    });
  }
}
