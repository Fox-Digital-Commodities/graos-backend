import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { Card } from './entities/card.entity';
import { Produto } from './entities/produto.entity';
import { Preco } from './entities/preco.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Card, Produto, Preco])
  ],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService]
})
export class CardsModule {}
