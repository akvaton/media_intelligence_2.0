import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  Repository,
  UpdateEvent,
} from 'typeorm';
import { Article } from './entities/news-item.entity';
import { InteractionsService } from 'src/interactions/interactions.service';
import { Interaction } from 'src/interactions/entities/interaction.entity';
import { SocialMediaKey } from '../interactions/dto/interaction.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Feed, FeedOrigin } from '../feeds/entities/feed.entity';

function precisionRound(number, precision) {
  const factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

@EventSubscriber()
export class NewsSubscriber implements EntitySubscriberInterface<Article> {
  constructor(
    @InjectRepository(Feed)
    private feedsRepository: Repository<Feed>,
    @InjectRepository(Article)
    private newsRepository: Repository<Article>,
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

  async beforeUpdate(event: UpdateEvent<Article>) {
    const article = event.entity;
    const { facebookInteractions, twitterInteractions } = article;

    if (facebookInteractions === -1 && twitterInteractions === -1) {
      return;
    }

    if (
      (article.facebookStartIndex && article.facebookEndIndex) ||
      (article.twitterStartIndex && article.twitterEndIndex)
    ) {
      let delta = 0;
      const interactions = await this.interactionsService.find({
        where: { articleId: article.id },
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
      const graphData =
        this.interactionsService.getGraphData(normalizedData) || [];

      ['facebook', 'twitter'].forEach((key: SocialMediaKey) => {
        const regressionCoefficient =
          this.interactionsService.getRegressionCoefficient(
            article as Article,
            graphData,
            key,
          );

        event.entity[`${key}Regression`] = precisionRound(
          regressionCoefficient,
          3,
        );
      });
    }
  }
}
