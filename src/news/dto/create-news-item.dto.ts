import { Feed } from 'src/feeds/entities/feed.entity';

export class CreateNewsItemDto {
  title: string;
  link: string;
  pubDate: string;
  sourceId: number;
}
