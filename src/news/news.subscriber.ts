import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { NewsItem } from './entities/news-item.entity';
import { InteractionsService } from '../interactions/interactions.service';

@EventSubscriber()
export class NewsSubscriber implements EntitySubscriberInterface<NewsItem> {
  constructor(
    private interactionsService: InteractionsService,
    connection: Connection,
  ) {
    connection.subscribers.push(this);
  }

  listenTo() {
    return NewsItem;
  }

  afterInsert(event: InsertEvent<NewsItem>) {
    this.interactionsService.processNewsItem(event.entity);
  }
}
