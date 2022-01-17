import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { Feed } from './entities/feed.entity';
import { FeedsService } from './feeds.service';

@EventSubscriber()
export class FeedsSubscriber implements EntitySubscriberInterface<Feed> {
  constructor(private feedsService: FeedsService, connection: Connection) {
    connection.subscribers.push(this);
  }

  listenTo() {
    return Feed;
  }

  afterInsert(event: InsertEvent<Feed>) {
    return this.feedsService.enqueueFeedsParsing(event.entity);
  }
}
