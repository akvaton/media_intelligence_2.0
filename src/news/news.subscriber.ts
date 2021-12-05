import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { NewsItem } from './entities/news-item.entity';
import { InteractionsService } from 'src/interactions/interactions.service';

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
    this.interactionsService.enqueueFacebookInteractionsProcessing({
      newsItem: event.entity,
    });
  }

  afterUpdate(event: UpdateEvent<NewsItem>) {
    if (event.entity?.deletedAt) {
      this.interactionsService.cancelEnqueuedJobsForNewsItem(event.entity);
      // TODO this.interactionsService remove all interactions
    }
  }

  async afterLoad(newsItem: NewsItem): Promise<void> {
    const interactions = await this.interactionsService.find({
      where: { articleId: newsItem.id },
      order: { id: 'DESC' },
    });

    newsItem.twitterInteractions = interactions.at(-1)?.twitterInteractions;
    newsItem.facebookInteractions = interactions.at(-1)?.facebookInteractions;
    newsItem.facebookGraphData =
      this.interactionsService.getFacebookGraphData(interactions);
    newsItem.facebookRegressionCoefficient =
      this.interactionsService.getFacebookRegressionCoefficient(
        newsItem.facebookGraphData,
      );
  }
}
