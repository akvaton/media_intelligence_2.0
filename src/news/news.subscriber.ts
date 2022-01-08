import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  Repository,
} from 'typeorm';
import { Article } from './entities/news-item.entity';
import { InteractionsService } from 'src/interactions/interactions.service';
import { Interaction } from 'src/interactions/entities/interaction.entity';
import { SocialMediaKey } from '../interactions/dto/interaction.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Feed, FeedOrigin } from '../feeds/entities/feed.entity';

@EventSubscriber()
export class NewsSubscriber implements EntitySubscriberInterface<Article> {
  constructor(
    @InjectRepository(Feed)
    private feedsRepository: Repository<Feed>,
    private interactionsService: InteractionsService,
    connection: Connection,
  ) {
    connection.subscribers.push(this);
  }

  listenTo() {
    return Article;
  }

  async afterInsert(event: InsertEvent<Article>) {
    const { entity } = event;
    const feed = await this.feedsRepository.findOne(entity.sourceId);
    if (feed.origin === FeedOrigin.UKR) {
      return this.interactionsService.enqueueUkrainianAudienceTimeMeasuring({
        newsItem: event.entity,
      });
    } else if (feed.origin === FeedOrigin.USA) {
      return this.interactionsService.enqueueTwitterInteractionsProcessing(
        event.entity,
      );
    }
  }

  async afterLoad(newsItem: Article): Promise<void> {
    let delta = 0;
    const interactions = await this.interactionsService.find({
      where: { articleId: newsItem.id },
      order: { id: 'ASC' },
    });
    const normalizedData = interactions.map((interaction, index) => {
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
    debugger;
    ['facebook', 'twitter'].forEach((key: SocialMediaKey) => {
      newsItem[`${key}Regression`] = this.interactionsService
        .getRegressionCoefficient(newsItem, key)
        .toFixed(3);
    });
  }
}
