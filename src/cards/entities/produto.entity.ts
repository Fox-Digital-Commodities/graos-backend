import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Card } from './card.entity';
import { Preco } from './preco.entity';

@Entity('produtos')
export class Produto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_id' })
  cardId: string;

  @Column({ length: 100 })
  nome: string;

  @Column({ length: 20, nullable: true })
  safra: string;

  @Column({ length: 10, nullable: true })
  modalidade: string;

  @Column({ length: 2, nullable: true })
  uf: string;

  @Column({ length: 100, nullable: true })
  municipio: string;

  @ManyToOne(() => Card, (card) => card.produtos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @OneToMany(() => Preco, (preco) => preco.produto, { cascade: true })
  precos: Preco[];
}

