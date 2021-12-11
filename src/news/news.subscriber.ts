import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { NewsItem } from './entities/news-item.entity';
import { InteractionsService } from 'src/interactions/interactions.service';
import { Interaction } from 'src/interactions/entities/interaction.entity';

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
    return this.interactionsService.enqueueFacebookInteractionsProcessing({
      newsItem: event.entity,
    });
  }

  async afterUpdate(event: UpdateEvent<NewsItem>) {
    if (event.entity?.deletedAt) {
      await Promise.all([
        this.interactionsService.cancelEnqueuedJobsForNewsItem(event.entity),
        this.interactionsService.delete({ articleId: event.entity.id }),
      ]);
    }
  }

  async afterLoad(newsItem: NewsItem): Promise<void> {
    let delta = 0;
    const interactions = await this.interactionsService.find({
      where: { articleId: newsItem.id },
      order: { id: 'ASC' },
    });
    const normalizedData = interactions.map((interaction, index) => {
      if (interaction.audienceTime < interactions[index - 1]?.audienceTime) {
        delta += interaction[index - 1]?.audienceTime;
      }

      return {
        ...interaction,
        audienceTime: (interaction.audienceTime += delta),
      } as Interaction;
    });

    newsItem.facebookGraphData =
      this.interactionsService.getFacebookGraphData(normalizedData) || [];
    newsItem.facebookRegressionCoefficient =
      this.interactionsService.getFacebookRegressionCoefficient(
        newsItem.facebookGraphData.slice(
          newsItem.startIndex - 1,
          newsItem.endIndex,
        ),
      );
  }
}
