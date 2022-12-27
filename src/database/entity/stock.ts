import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, ManyToOne, Index } from "typeorm";


export enum DeliveryBucket {
  ABOVE_80 = 'ABOVE_80',
  BETWEEN_60_80 = 'BETWEEN_60_80',
  BETWEEN_50_60 = 'BETWEEN_50_60',
  BETWEEN_40_50 = 'BETWEEN_40_50',
  LESS_THAN_40 = 'LESS_THAN_40'
}


@Entity({ name: 'delivery' })
@Index('uniqueDateAndSymbol',['date', 'symbol'], {
  unique: true,
})
export class Delivery extends BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  symbol: string;

  @Column({type: 'bigint'})
  volume: number;

  @Column({type: 'decimal'})
  @Index()
  deliveryPercentage: number

  @Column({type: 'date'})
  date: Date

  @Column({
    type: 'enum',
    enum: DeliveryBucket,
  })
  bucket: DeliveryBucket;

  @Column({
    type: 'bool',
    default: false
  })
  isSandeepPick: boolean;
}


@Entity({ name: 'Portfolio' })
@Index('portfolio',['tag', 'symbol'], {
  unique: true,
})
export class Portfolio extends BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  symbol: string;

  @Column({type: 'decimal'})
  @Index()
  avgPrice: number

  @Column({type: 'bigint'})
  @Index()
  num: number

  @Column({type: 'date'})
  date: Date

  @Column({type: 'text'})
  tag: string


  @Column({type: 'decimal', default: 0})
  @Index()
  stoplpss: number

}

@Entity({ name: 'processedDelivery' })
@Index('uniqueDateAndSymbolForProcessed',['date', 'symbol'], {
  unique: true
})
export class ProcessedDelivery extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  symbol: string;

  @Column({type: 'bigint'})
  volume: number

  @Column({type: 'decimal'})
  volumeMultiple: number;

  @Column({type: 'decimal'})
  @Index()
  deliveryPercentage: number

  @Column({type: 'decimal'})
  @Index()
  movingAverageVolume: number

  @Column({type: 'date'})
  date: Date

  @Column({
    type: 'enum',
    enum: DeliveryBucket,
  })
  bucket: DeliveryBucket;

  @Column({
    type: 'bool',
    default: false
  })
  isSandeepPick: boolean;
}