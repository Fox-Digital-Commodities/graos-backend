import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { KanbanBoard } from '../entities/kanban-board.entity';
import { KanbanColumn } from '../entities/kanban-column.entity';
import { KanbanCard } from '../entities/kanban-card.entity';
import { CardActivity } from '../entities/card-activity.entity';
import { Contact } from '../../whatsapp/entities/contact.entity';
import { Conversation } from '../../whatsapp/entities/conversation.entity';

@Injectable()
export class KanbanService {
  private readonly logger = new Logger(KanbanService.name);

  constructor(
    @InjectRepository(KanbanBoard)
    private kanbanBoardRepository: Repository<KanbanBoard>,
    @InjectRepository(KanbanColumn)
    private kanbanColumnRepository: Repository<KanbanColumn>,
    @InjectRepository(KanbanCard)
    private kanbanCardRepository: Repository<KanbanCard>,
    @InjectRepository(CardActivity)
    private cardActivityRepository: Repository<CardActivity>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
  ) {}

  // Boards
  async getAllBoards(instanceId?: string) {
    const queryBuilder = this.kanbanBoardRepository
      .createQueryBuilder('board')
      .leftJoinAndSelect('board.columns', 'columns')
      .orderBy('board.createdAt', 'DESC')
      .addOrderBy('columns.position', 'ASC');

    if (instanceId) {
      queryBuilder.where('board.permissions @> :instanceFilter', {
        instanceFilter: JSON.stringify({ whatsappInstances: [instanceId] })
      });
    }

    return await queryBuilder.getMany();
  }

  async getBoardById(boardId: string) {
    const board = await this.kanbanBoardRepository
      .createQueryBuilder('board')
      .leftJoinAndSelect('board.columns', 'columns')
      .leftJoinAndSelect('columns.cards', 'cards')
      .where('board.id = :boardId', { boardId })
      .orderBy('columns.position', 'ASC')
      .addOrderBy('cards.position', 'ASC')
      .getOne();

    if (!board) {
      throw new NotFoundException(`Board ${boardId} não encontrado`);
    }

    return board;
  }

  async createBoard(boardData: Partial<KanbanBoard>) {
    const board = this.kanbanBoardRepository.create({
      ...boardData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.kanbanBoardRepository.save(board);
  }

  async updateBoard(boardId: string, boardData: Partial<KanbanBoard>) {
    const board = await this.kanbanBoardRepository.findOne({ where: { id: boardId } });
    
    if (!board) {
      throw new NotFoundException(`Board ${boardId} não encontrado`);
    }

    Object.assign(board, boardData);
    board.updatedAt = new Date();

    return await this.kanbanBoardRepository.save(board);
  }

  async deleteBoard(boardId: string) {
    const result = await this.kanbanBoardRepository.delete(boardId);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Board ${boardId} não encontrado`);
    }

    return { success: true };
  }

  // Columns
  async createColumn(columnData: Partial<KanbanColumn>) {
    const column = this.kanbanColumnRepository.create({
      ...columnData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.kanbanColumnRepository.save(column);
  }

  async updateColumn(columnId: string, columnData: Partial<KanbanColumn>) {
    const column = await this.kanbanColumnRepository.findOne({ where: { id: columnId } });
    
    if (!column) {
      throw new NotFoundException(`Coluna ${columnId} não encontrada`);
    }

    Object.assign(column, columnData);
    column.updatedAt = new Date();

    return await this.kanbanColumnRepository.save(column);
  }

  async deleteColumn(columnId: string) {
    // Verificar se há cards na coluna
    const cardsCount = await this.kanbanCardRepository.count({ where: { columnId } });
    
    if (cardsCount > 0) {
      throw new BadRequestException(`Não é possível excluir coluna com ${cardsCount} cards`);
    }

    const result = await this.kanbanColumnRepository.delete(columnId);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Coluna ${columnId} não encontrada`);
    }

    return { success: true };
  }

  // Cards
  async createCard(cardData: Partial<KanbanCard>) {
    // Definir posição se não fornecida
    if (cardData.position === undefined) {
      cardData.position = await this.getNextCardPosition(cardData.columnId);
    }

    const card = this.kanbanCardRepository.create({
      ...cardData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedCard = await this.kanbanCardRepository.save(card);

    // Registrar atividade de criação
    await this.createCardActivity({
      cardId: savedCard.id,
      type: 'created',
      userId: 'system', // TODO: Pegar do contexto de autenticação
      description: 'Card criado',
    });

    return savedCard;
  }

  async updateCard(cardId: string, cardData: Partial<KanbanCard>) {
    const card = await this.kanbanCardRepository.findOne({ where: { id: cardId } });
    
    if (!card) {
      throw new NotFoundException(`Card ${cardId} não encontrado`);
    }

    const oldData = { ...card };
    Object.assign(card, cardData);
    card.updatedAt = new Date();

    const savedCard = await this.kanbanCardRepository.save(card);

    // Registrar atividades de mudança
    await this.trackCardChanges(oldData, savedCard);

    return savedCard;
  }

  async moveCard(cardId: string, targetColumnId: string, targetPosition: number) {
    const card = await this.kanbanCardRepository.findOne({ where: { id: cardId } });
    
    if (!card) {
      throw new NotFoundException(`Card ${cardId} não encontrado`);
    }

    const oldColumnId = card.columnId;
    
    // Atualizar posições na coluna de origem
    if (oldColumnId !== targetColumnId) {
      await this.adjustCardPositions(oldColumnId, card.position, -1);
    }

    // Atualizar posições na coluna de destino
    await this.adjustCardPositions(targetColumnId, targetPosition, 1);

    // Atualizar card
    card.columnId = targetColumnId;
    card.position = targetPosition;
    card.updatedAt = new Date();

    const savedCard = await this.kanbanCardRepository.save(card);

    // Registrar atividade de movimentação
    if (oldColumnId !== targetColumnId) {
      const oldColumn = await this.kanbanColumnRepository.findOne({ where: { id: oldColumnId } });
      const newColumn = await this.kanbanColumnRepository.findOne({ where: { id: targetColumnId } });

      await this.createCardActivity({
        cardId: savedCard.id,
        type: 'moved',
        userId: 'system', // TODO: Pegar do contexto de autenticação
        description: `Movido de "${oldColumn?.name}" para "${newColumn?.name}"`,
        data: {
          fromColumn: oldColumn?.name,
          toColumn: newColumn?.name,
        },
      });
    }

    return savedCard;
  }

  async deleteCard(cardId: string) {
    const card = await this.kanbanCardRepository.findOne({ where: { id: cardId } });
    
    if (!card) {
      throw new NotFoundException(`Card ${cardId} não encontrado`);
    }

    // Ajustar posições dos outros cards
    await this.adjustCardPositions(card.columnId, card.position, -1);

    // Excluir atividades do card
    await this.cardActivityRepository.delete({ cardId });

    // Excluir card
    await this.kanbanCardRepository.delete(cardId);

    return { success: true };
  }

  async getCardById(cardId: string) {
    const card = await this.kanbanCardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.activities', 'activities')
      .where('card.id = :cardId', { cardId })
      .orderBy('activities.createdAt', 'DESC')
      .getOne();

    if (!card) {
      throw new NotFoundException(`Card ${cardId} não encontrado`);
    }

    // Buscar dados da conversa se disponível
    if (card.conversationId) {
      const conversation = await this.conversationRepository
        .createQueryBuilder('conversation')
        .leftJoinAndSelect('conversation.contact', 'contact')
        .leftJoinAndSelect('conversation.messages', 'messages')
        .where('conversation.id = :conversationId', { conversationId: card.conversationId })
        .orderBy('messages.timestamp', 'DESC')
        .limit(10)
        .getOne();

      if (conversation) {
        (card as any).conversation = conversation;
      }
    }

    return card;
  }

  // Activities
  async createCardActivity(activityData: Partial<CardActivity>) {
    const activity = this.cardActivityRepository.create({
      ...activityData,
      createdAt: new Date(),
    });

    return await this.cardActivityRepository.save(activity);
  }

  async getCardActivities(cardId: string) {
    return await this.cardActivityRepository
      .createQueryBuilder('activity')
      .where('activity.cardId = :cardId', { cardId })
      .orderBy('activity.createdAt', 'DESC')
      .getMany();
  }

  // Métodos auxiliares
  private async getNextCardPosition(columnId: string): Promise<number> {
    const lastCard = await this.kanbanCardRepository
      .createQueryBuilder('card')
      .where('card.columnId = :columnId', { columnId })
      .orderBy('card.position', 'DESC')
      .getOne();

    return lastCard ? lastCard.position + 1 : 0;
  }

  private async adjustCardPositions(columnId: string, fromPosition: number, adjustment: number) {
    if (adjustment > 0) {
      // Inserindo: mover cards para frente
      await this.kanbanCardRepository
        .createQueryBuilder()
        .update(KanbanCard)
        .set({ position: () => 'position + 1' })
        .where('columnId = :columnId AND position >= :fromPosition', { columnId, fromPosition })
        .execute();
    } else {
      // Removendo: mover cards para trás
      await this.kanbanCardRepository
        .createQueryBuilder()
        .update(KanbanCard)
        .set({ position: () => 'position - 1' })
        .where('columnId = :columnId AND position > :fromPosition', { columnId, fromPosition })
        .execute();
    }
  }

  private async trackCardChanges(oldCard: KanbanCard, newCard: KanbanCard) {
    const changes = [];

    // Verificar mudanças específicas
    if (oldCard.title !== newCard.title) {
      changes.push({
        type: 'title_changed',
        description: `Título alterado de "${oldCard.title}" para "${newCard.title}"`,
      });
    }

    if (oldCard.priority !== newCard.priority) {
      changes.push({
        type: 'priority_changed',
        description: `Prioridade alterada de "${oldCard.priority}" para "${newCard.priority}"`,
      });
    }

    if (oldCard.assigneeId !== newCard.assigneeId) {
      changes.push({
        type: 'assigned',
        description: newCard.assigneeId ? 'Card atribuído' : 'Atribuição removida',
        data: { assigneeId: newCard.assigneeId },
      });
    }

    if (oldCard.status !== newCard.status) {
      changes.push({
        type: 'status_changed',
        description: `Status alterado de "${oldCard.status}" para "${newCard.status}"`,
      });
    }

    // Registrar todas as mudanças
    for (const change of changes) {
      await this.createCardActivity({
        cardId: newCard.id,
        type: change.type as any,
        userId: 'system', // TODO: Pegar do contexto de autenticação
        description: change.description,
        data: change.data,
      });
    }
  }

  // Estatísticas
  async getBoardStats(boardId: string) {
    const board = await this.kanbanBoardRepository.findOne({ where: { id: boardId } });
    
    if (!board) {
      throw new NotFoundException(`Board ${boardId} não encontrado`);
    }

    const totalCards = await this.kanbanCardRepository.count({ where: { column: { boardId } } });
    const completedCards = await this.kanbanCardRepository.count({ 
      where: { column: { boardId }, status: 'completed' } 
    });
    const overdueCards = await this.kanbanCardRepository
      .createQueryBuilder('card')
      .leftJoin('card.column', 'column')
      .where('column.boardId = :boardId', { boardId })
      .andWhere('card.dueDate < :now', { now: new Date() })
      .andWhere('card.status != :completed', { completed: 'completed' })
      .getCount();

    return {
      totalCards,
      completedCards,
      overdueCards,
      completionRate: totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0,
    };
  }
}

