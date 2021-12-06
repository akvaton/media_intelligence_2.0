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

  @Column({ default: 3 })
  startIndex: number;

  @Column({ default: 19 })
  endIndex: number;

  @OneToMany(() => Interaction, (interaction) => interaction.article)
  interactions: Interaction[];

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ nullable: true })
  twitterInteractions: number;

  @Column({ nullable: true })
  facebookInteractions: number;

  public facebookGraphData: Array<any>;

  public facebookRegressionCoefficient: unknown;
}
