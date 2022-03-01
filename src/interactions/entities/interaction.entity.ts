import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Article } from 'src/news/entities/news-item.entity';

@Entity('interactions')
export class Interaction extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'datetimeoffset', name: 'Time of request' })
  requestTime: Date;

  @Column({ type: 'int', default: -1 })
  facebookInteractions: number;

  @Column({ type: 'int', default: -1 })
  twitterInteractions: number;

  @Column({ type: 'int', name: 'Audience time', default: -1 })
  audienceTime: number;

  @ManyToOne(() => Article, (newsItem) => newsItem.interactions, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'articleId' })
  article: Article;

  @Column({ name: 'articleId', type: 'int' })
  articleId: number;

  @Column({ default: false })
  isAccumulated: boolean;
}
