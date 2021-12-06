import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NewsItem } from '../../news/entities/news-item.entity';

export enum FeedOrigin {
  UKRAINE = 'UKR',
  US = 'USA',
}

@Entity()
export class Feed extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  url: string;

  @OneToMany(() => NewsItem, (article) => article.source)
  articles: NewsItem[];

  @Column({ type: 'boolean', default: true })
  trackFacebookInteractions: boolean;

  @Column({ type: 'boolean', default: false })
  trackTwitterInteractions: boolean;
}
