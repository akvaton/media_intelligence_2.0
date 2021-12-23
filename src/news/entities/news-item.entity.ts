import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Feed } from 'src/feeds/entities/feed.entity';
import { Interaction } from 'src/interactions/entities/interaction.entity';
import { GraphData } from '../../interactions/dto/interaction.dto';

@Entity('articles')
export class NewsItem extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  link: string;

  @Column()
  title: string;

  @Column({ type: 'timestamptz', name: 'Date of Publication', nullable: true })
  pubDate: Date;

  @ManyToOne(() => Feed, (feed) => feed.articles, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'sourceId' })
  source: Feed;

  @Column({ name: 'sourceId', type: 'int', nullable: false })
  sourceId: number;

  @Column({ default: 5 })
  startIndex: number;

  @Column({ default: 15 })
  endIndex: number;

  @OneToMany(() => Interaction, (interaction) => interaction.article)
  interactions: Interaction[];

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ default: -1 })
  twitterInteractions: number;

  @Column({ default: -1 })
  facebookInteractions: number;

  public graphData: GraphData;

  public facebookRegressionCoefficient: unknown;

  public twitterRegressionCoefficient: unknown;
}
