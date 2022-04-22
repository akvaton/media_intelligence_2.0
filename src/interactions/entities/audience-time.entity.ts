import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AudienceTime extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'datetimeoffset', name: 'Time of request' })
  requestTime: Date;

  @Column({ type: 'int', name: 'Twitter interactions', default: -1 })
  twitterInteractions: number;
}
