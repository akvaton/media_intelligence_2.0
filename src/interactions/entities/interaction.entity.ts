import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { NewsItem } from 'src/news/entities/news-item.entity';

@Entity('interactions')
export class Interaction extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('datetime')
  requestTime: Date;

  @Column('int')
  facebookInteractions: number;

  @Column('int')
  twitterInteractions: number;

  @ManyToOne(() => NewsItem, (newsItem) => newsItem.interactions)
  article: NewsItem;

  @RelationId((interaction: Interaction) => interaction.article)
  articleId: number;

  public toString(): string {
    return this.article.title;
  }
}
