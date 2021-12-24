import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NewsItem } from 'src/news/entities/news-item.entity';

@Entity('interactions')
export class Interaction extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamptz', name: 'Time of request' })
  requestTime: Date;

  @Column('int')
  facebookInteractions: number;

  @Column({ type: 'int', default: -1, nullable: true })
  twitterInteractions: number;

  @Column({ type: 'int', name: 'Audience time' })
  audienceTime: number;

  @ManyToOne(() => NewsItem, (newsItem) => newsItem.interactions, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'articleId' })
  article: NewsItem;

  @Column({ name: 'articleId', type: 'int' })
  articleId: number;
}
