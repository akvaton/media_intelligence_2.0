import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Feed } from 'src/feeds/entities/feed.entity';

@Entity('article')
export class NewsItem extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  link: string;

  @Column()
  title: string;

  @Column()
  pubDate: string;

  @ManyToOne(() => Feed, (feed) => feed.articles)
  source: Feed;
}
