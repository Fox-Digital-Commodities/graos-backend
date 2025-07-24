import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Produto } from './produto.entity';

@Entity('precos')
export class Preco {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'produto_id' })
  produtoId: string;

  @Column({ length: 50 })
  embarque: string;

  @Column({ type: 'date' })
  pagamento: Date;

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 4, 
    nullable: true, 
    name: 'preco_usd' 
  })
  precoUsd: number;

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2, 
    name: 'preco_brl' 
  })
  precoBrl: number;

  @ManyToOne(() => Produto, (produto) => produto.precos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'produto_id' })
  produto: Produto;
}

