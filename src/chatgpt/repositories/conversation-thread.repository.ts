import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationThread } from '../entities/conversation-thread.entity';

@Injectable()
export class ConversationThreadRepository {
  constructor(
    @InjectRepository(ConversationThread)
    private readonly repository: Repository<ConversationThread>,
  ) {}

  /**
   * Buscar thread ativa para uma conversa específica
   */
  async findActiveByConversationId(conversationId: string): Promise<ConversationThread | null> {
    return this.repository.findOne({
      where: {
        conversationId,
        isActive: true,
      },
      order: {
        lastUsedAt: 'DESC',
        updatedAt: 'DESC',
      },
    });
  }

  /**
   * Criar nova thread para conversa
   */
  async createForConversation(
    conversationId: string,
    threadId: string,
    assistantId: string,
    metadata?: any,
  ): Promise<ConversationThread> {
    const conversationThread = this.repository.create({
      conversationId,
      threadId,
      assistantId,
      metadata,
      lastUsedAt: new Date(),
    });

    return this.repository.save(conversationThread);
  }

  /**
   * Atualizar thread existente
   */
  async updateThread(
    id: string,
    messageCount: number,
    metadata?: any,
  ): Promise<ConversationThread> {
    const thread = await this.repository.findOne({ where: { id } });
    
    if (!thread) {
      throw new Error(`Thread não encontrada: ${id}`);
    }

    thread.updateUsage(messageCount, metadata);
    
    return this.repository.save(thread);
  }

  /**
   * Desativar thread (marcar como inativa)
   */
  async deactivateThread(id: string): Promise<void> {
    await this.repository.update(id, {
      isActive: false,
      updatedAt: new Date(),
    });
  }

  /**
   * Desativar todas as threads de uma conversa
   */
  async deactivateAllForConversation(conversationId: string): Promise<void> {
    await this.repository.update(
      { conversationId, isActive: true },
      { isActive: false, updatedAt: new Date() },
    );
  }

  /**
   * Buscar thread por ID
   */
  async findById(id: string): Promise<ConversationThread | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Buscar thread por threadId do OpenAI
   */
  async findByThreadId(threadId: string): Promise<ConversationThread | null> {
    return this.repository.findOne({ where: { threadId } });
  }

  /**
   * Listar threads de uma conversa (histórico)
   */
  async findByConversationId(conversationId: string): Promise<ConversationThread[]> {
    return this.repository.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Limpar threads antigas (mais de 7 dias sem uso)
   */
  async cleanupOldThreads(): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await this.repository.update(
      {
        lastUsedAt: { $lt: sevenDaysAgo } as any,
        isActive: true,
      },
      { isActive: false },
    );

    return result.affected || 0;
  }

  /**
   * Estatísticas de uso
   */
  async getUsageStats(conversationId?: string): Promise<{
    totalThreads: number;
    activeThreads: number;
    totalSuggestions: number;
    averageSuggestionsPerThread: number;
  }> {
    const whereClause = conversationId ? { conversationId } : {};

    const [totalThreads, activeThreads, suggestionsResult] = await Promise.all([
      this.repository.count({ where: whereClause }),
      this.repository.count({ where: { ...whereClause, isActive: true } }),
      this.repository
        .createQueryBuilder('thread')
        .select('SUM(thread.totalSuggestionsGenerated)', 'total')
        .where(conversationId ? 'thread.conversationId = :conversationId' : '1=1', { conversationId })
        .getRawOne(),
    ]);

    const totalSuggestions = parseInt(suggestionsResult?.total || '0');
    const averageSuggestionsPerThread = totalThreads > 0 ? totalSuggestions / totalThreads : 0;

    return {
      totalThreads,
      activeThreads,
      totalSuggestions,
      averageSuggestionsPerThread: Math.round(averageSuggestionsPerThread * 100) / 100,
    };
  }
}

