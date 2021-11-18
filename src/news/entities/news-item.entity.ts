import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { Feed } from 'src/feeds/entities/feed.entity';
import { Interaction } from '../../interactions/entities/interaction.entity';

@Entity('articles')
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
  // @JoinColumn({ name: 'sourceId' })
  source: Feed;

  @RelationId((newsItem: NewsItem) => newsItem.source)
  sourceId: number;

  public toString(): string {
    return this.title;
  }

  @OneToMany(() => Interaction, (interaction) => interaction.article)
  interactions: Interaction[];
}
