import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Article } from 'src/news/entities/news-item.entity';

export enum FeedOrigin {
  UKR = 'UKR',
  USA = 'USA',
}

@Entity()
export class Feed extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  url: string;

  @OneToMany(() => Article, (article) => article.source)
  articles: Article[];

  @Column({
    enum: FeedOrigin,
    default: FeedOrigin.USA,
  })
  origin: string;
}
