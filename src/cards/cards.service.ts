import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card } from './entities/card.entity';
import { Produto } from './entities/produto.entity';
import { Preco } from './entities/preco.entity';
import { CreateCardDto } from '../common/dto/create-card.dto';
import { ICardData } from '../common/interfaces/card-data.interface';

@Injectable()
export class CardsService {
  private readonly logger = new Logger(CardsService.name);

  constructor(
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
    @InjectRepository(Produto)
    private produtoRepository: Repository<Produto>,
    @InjectRepository(Preco)
    private precoRepository: Repository<Preco>,
  ) {}

  /**
   * Criar um novo card com produtos e preços
   */
  async create(cardData: ICardData): Promise<Card> {
    this.logger.log(`Criando novo card: ${cardData.titulo}`);

    const queryRunner = this.cardRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Criar o card principal
      const card = new Card();
      card.titulo = cardData.titulo || '';
      card.dataReferencia = new Date(cardData.dataReferencia);
      card.cotacaoDolar = cardData.cotacaoDolar || 0;
      card.cbot = cardData.cbot || 0;
      card.observacoes = cardData.observacoes || '';

      const savedCard = await queryRunner.manager.save(card);

      // Criar produtos e preços
      for (const produtoData of cardData.produtos || []) {
        const produto = new Produto();
        produto.nome = produtoData.nome;
        produto.safra = produtoData.safra || '';
        produto.modalidade = produtoData.modalidade || '';
        produto.uf = produtoData.uf || '';
        produto.municipio = produtoData.municipio || '';
        produto.card = savedCard;

        const savedProduto = await queryRunner.manager.save(produto);

        // Criar preços para o produto
        for (const precoData of produtoData.precos || []) {
          const preco = new Preco();
          preco.embarque = precoData.embarque;
          preco.pagamento = new Date(precoData.pagamento);
          preco.precoUsd = precoData.precoUsd || 0;
          preco.precoBrl = precoData.precoBrl;
          preco.produto = savedProduto;

          await queryRunner.manager.save(preco);
        }
      }

      await queryRunner.commitTransaction();
      
      // Retornar card completo com relações
      return this.findOne(savedCard.id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Erro ao criar card: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Listar todos os cards
   */
  async findAll(): Promise<Card[]> {
    return this.cardRepository.find({
      relations: ['produtos', 'produtos.precos'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Buscar card por ID
   */
  async findOne(id: string): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id },
      relations: ['produtos', 'produtos.precos'],
    });

    if (!card) {
      throw new NotFoundException(`Card com ID ${id} não encontrado`);
    }

    return card;
  }

  /**
   * Atualizar card
   */
  async update(id: string, cardData: Partial<ICardData>): Promise<Card> {
    const card = await this.findOne(id);
    
    // Atualizar campos do card
    Object.assign(card, {
      titulo: cardData.titulo || card.titulo,
      dataReferencia: cardData.dataReferencia ? new Date(cardData.dataReferencia) : card.dataReferencia,
      cotacaoDolar: cardData.cotacaoDolar !== undefined ? cardData.cotacaoDolar : card.cotacaoDolar,
      cbot: cardData.cbot !== undefined ? cardData.cbot : card.cbot,
      observacoes: cardData.observacoes !== undefined ? cardData.observacoes : card.observacoes,
    });

    await this.cardRepository.save(card);
    return this.findOne(id);
  }

  /**
   * Remover card
   */
  async remove(id: string): Promise<void> {
    const card = await this.findOne(id);
    await this.cardRepository.remove(card);
    this.logger.log(`Card ${id} removido com sucesso`);
  }

  /**
   * Buscar cards por período
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Card[]> {
    return this.cardRepository.find({
      where: {
        dataReferencia: {
          gte: startDate,
          lte: endDate,
        } as any,
      },
      relations: ['produtos', 'produtos.precos'],
      order: { dataReferencia: 'DESC' },
    });
  }

  /**
   * Buscar cards por produto
   */
  async findByProduct(productName: string): Promise<Card[]> {
    return this.cardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.produtos', 'produto')
      .leftJoinAndSelect('produto.precos', 'preco')
      .where('produto.nome ILIKE :name', { name: `%${productName}%` })
      .orderBy('card.dataReferencia', 'DESC')
      .getMany();
  }

  /**
   * Estatísticas gerais
   */
  async getStatistics(): Promise<{
    totalCards: number;
    totalProdutos: number;
    totalPrecos: number;
    ultimaAtualizacao: Date;
  }> {
    const [totalCards, totalProdutos, totalPrecos] = await Promise.all([
      this.cardRepository.count(),
      this.produtoRepository.count(),
      this.precoRepository.count(),
    ]);

    const ultimoCard = await this.cardRepository.findOne({
      order: { createdAt: 'DESC' },
    });

    return {
      totalCards,
      totalProdutos,
      totalPrecos,
      ultimaAtualizacao: ultimoCard?.createdAt || new Date(),
    };
  }
}
