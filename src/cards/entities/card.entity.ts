import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { Produto } from './produto.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('cards')
export class Card {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ nullable: true })
  titulo: string;

  @Column({ type: 'date', name: 'data_referencia' })
  dataReferencia: Date;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true, name: 'cotacao_dolar' })
  cotacaoDolar: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cbot: number;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @Column({ nullable: true, name: 'arquivo_original' })
  arquivoOriginal: string;

  @OneToMany(() => Produto, (produto) => produto.card, { cascade: true })
  produtos: Produto[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

