import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { Produto } from './produto.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('precos')
export class Preco {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

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

