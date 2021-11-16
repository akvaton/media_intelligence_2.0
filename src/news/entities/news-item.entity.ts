import { BaseEntity, Column, PrimaryColumn, Entity, ManyToOne } from 'typeorm';
import { Feed } from '../../feeds/entities/feed.entity';

@Entity('article')
export class NewsItem extends BaseEntity {
  @PrimaryColumn({ unique: true })
  link: string;

  @Column()
  title: string;

  @Column()
  pubDate: string;

  @ManyToOne(() => Feed, (feed) => feed.articles)
  source: Feed;
}
