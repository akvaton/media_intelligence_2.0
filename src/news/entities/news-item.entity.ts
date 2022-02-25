import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { Feed } from 'src/feeds/entities/feed.entity';
import { Interaction } from 'src/interactions/entities/interaction.entity';
import { GraphData } from '../../interactions/dto/interaction.dto';

@Entity('articles')
export class Article extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  link: string;

  @Column()
  title: string;

  @Column({
    type: 'datetimeoffset',
    name: 'Date of Publication',
    nullable: true,
  })
  pubDate: Date;

  @ManyToOne(() => Feed, (feed) => feed.articles, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'sourceId' })
  source: Feed;

  @Column({ name: 'sourceId', type: 'int', nullable: false })
  sourceId: number;

  @Column({ type: 'tinyint', nullable: true })
  facebookStartIndex: number;

  @Column({ type: 'tinyint', nullable: true })
  facebookEndIndex: number;

  @Column({ type: 'tinyint', nullable: true })
  twitterStartIndex: number;

  @Column({ type: 'tinyint', nullable: true })
  twitterEndIndex: number;

  @OneToMany(() => Interaction, (interaction) => interaction.article)
  interactions: Interaction[];

  @Column({ default: -1 })
  twitterInteractions: number;

  @Column({ default: -1 })
  facebookInteractions: number;

  @Column({ default: -1, type: 'float' })
  facebookRegression: number;

  @Column({ default: -1, type: 'float' })
  twitterRegression: number;
}
