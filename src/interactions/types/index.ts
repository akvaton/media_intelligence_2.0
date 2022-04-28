import { Article } from '../../news/entities/news-item.entity';

export interface TwitterAudienceTimePayload {
  interactionIndex: number;
  previousAudienceTime?: number;
  publicationDate: string;
  articleId: number;
}

export interface OldTwitterAudiencePayload {
  newsItem: Article;
  repeatedTimes?: number;
}
