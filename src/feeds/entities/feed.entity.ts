import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NewsItem } from 'src/news/entities/news-item.entity';

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
}
