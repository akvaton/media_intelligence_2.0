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

  async afterInsert(event: InsertEvent<NewsItem>) {
    return Promise.all([
      this.interactionsService.enqueueFacebookInteractionsProcessing({
        newsItem: event.entity,
      }),
      this.interactionsService.enqueueTwitterInteractionsProcessing(
        event.entity,
      ),
    ]);
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
    const normalizedData = interactions.slice(1).map((interaction, index) => {
      if (interaction.audienceTime < interactions[index - 1]?.audienceTime) {
        delta += interactions[index - 1].audienceTime;
      }

      return {
        ...interaction,
        audienceTime: interaction.audienceTime + delta,
      } as Interaction;
    });

    newsItem.graphData =
      this.interactionsService.getGraphData(normalizedData) || [];
    newsItem.facebookRegressionCoefficient =
      this.interactionsService.getRegressionCoefficient(
        newsItem.graphData.slice(newsItem.startIndex, newsItem.endIndex),
        'lnFacebookInteractions',
      );
    newsItem.twitterRegressionCoefficient =
      this.interactionsService.getRegressionCoefficient(
        newsItem.graphData.slice(newsItem.startIndex, newsItem.endIndex),
        'lnTwitterInteractions',
      );
  }
}
