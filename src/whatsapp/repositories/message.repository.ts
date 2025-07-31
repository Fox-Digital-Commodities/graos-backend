import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between, In, MoreThanOrEqual } from 'typeorm';
import { Message, MessageType, MessageStatus } from '../entities/message.entity';

@Injectable()
export class MessageRepository {
  constructor(
    @InjectRepository(Message)
    private readonly repository: Repository<Message>,
  ) {}

  // Buscar por WhatsApp ID
  async findByWhatsAppId(whatsappId: string): Promise<Message | null> {
    return this.repository.findOne({
      where: { whatsappId },
      relations: ['conversation', 'conversation.contact'],
    });
  }

  // Buscar mensagens de uma conversa
  async findByConversationId(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    return this.repository.find({
      where: { conversationId, isDeleted: false },
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['conversation'],
    });
  }

  // Buscar mensagens recentes de uma conversa
  async findRecentByConversationId(
    conversationId: string,
    limit: number = 20
  ): Promise<Message[]> {
    return this.repository.find({
      where: { conversationId, isDeleted: false },
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['conversation'],
    });
  }

  // Buscar mensagens por tipo
  async findByType(
    type: MessageType,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    return this.repository.find({
      where: { type, isDeleted: false },
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['conversation', 'conversation.contact'],
    });
  }

  // Buscar mensagens de mídia
  async findMediaMessages(
    conversationId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    const whereCondition: any = {
      type: In([
        MessageType.IMAGE,
        MessageType.VIDEO,
        MessageType.AUDIO,
        MessageType.DOCUMENT,
        MessageType.PTT,
        MessageType.VOICE
      ]),
      isDeleted: false
    };

    if (conversationId) {
      whereCondition.conversationId = conversationId;
    }

    return this.repository.find({
      where: whereCondition,
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['conversation', 'conversation.contact'],
    });
  }

  // Buscar mensagens de áudio
  async findAudioMessages(
    conversationId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    const whereCondition: any = {
      type: In([
        MessageType.AUDIO,
        MessageType.PTT,
        MessageType.VOICE
      ]),
      isDeleted: false
    };

    if (conversationId) {
      whereCondition.conversationId = conversationId;
    }

    return this.repository.find({
      where: whereCondition,
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['conversation', 'conversation.contact'],
    });
  }

  // Buscar mensagens que precisam de transcrição
  async findMessagesNeedingTranscription(): Promise<Message[]> {
    return this.repository
      .createQueryBuilder('message')
      .where('message.type IN (:...audioTypes)', {
        audioTypes: [MessageType.AUDIO, MessageType.PTT, MessageType.VOICE]
      })
      .andWhere('message.transcription IS NULL')
      .andWhere('message.mediaDuration <= 30')
      .andWhere('message.mediaUrl IS NOT NULL')
      .andWhere('message.isDeleted = false')
      .orderBy('message.timestamp', 'DESC')
      .limit(10) // Processar até 10 por vez
      .getMany();
  }

  // Buscar mensagens com transcrição
  async findTranscribedMessages(
    conversationId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('message')
      .where('message.transcription IS NOT NULL')
      .andWhere('message.isDeleted = false');

    if (conversationId) {
      queryBuilder.andWhere('message.conversationId = :conversationId', { conversationId });
    }

    return queryBuilder
      .orderBy('message.timestamp', 'DESC')
      .take(limit)
      .skip(offset)
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('conversation.contact', 'contact')
      .getMany();
  }

  // Buscar mensagens por período
  async findByDateRange(
    dateFrom: Date,
    dateTo: Date,
    conversationId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Message[]> {
    const whereCondition: any = {
      timestamp: Between(dateFrom, dateTo),
      isDeleted: false
    };

    if (conversationId) {
      whereCondition.conversationId = conversationId;
    }

    return this.repository.find({
      where: whereCondition,
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['conversation', 'conversation.contact'],
    });
  }

  // Buscar mensagens por texto (busca full-text)
  async searchByText(
    searchText: string,
    conversationId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('message')
      .where('message.isDeleted = false')
      .andWhere(
        '(message.body ILIKE :searchText OR message.caption ILIKE :searchText OR message.transcription ILIKE :searchText)',
        { searchText: `%${searchText}%` }
      );

    if (conversationId) {
      queryBuilder.andWhere('message.conversationId = :conversationId', { conversationId });
    }

    return queryBuilder
      .orderBy('message.timestamp', 'DESC')
      .take(limit)
      .skip(offset)
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('conversation.contact', 'contact')
      .getMany();
  }

  // Buscar mensagens marcadas com estrela
  async findStarredMessages(
    conversationId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    const whereCondition: any = {
      isStarred: true,
      isDeleted: false
    };

    if (conversationId) {
      whereCondition.conversationId = conversationId;
    }

    return this.repository.find({
      where: whereCondition,
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['conversation', 'conversation.contact'],
    });
  }

  // Buscar mensagens encaminhadas
  async findForwardedMessages(
    conversationId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    const whereCondition: any = {
      isForwarded: true,
      isDeleted: false
    };

    if (conversationId) {
      whereCondition.conversationId = conversationId;
    }

    return this.repository.find({
      where: whereCondition,
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['conversation', 'conversation.contact'],
    });
  }

  // Buscar mensagens por tags
  async findByTags(
    tags: string[],
    conversationId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('message')
      .where('message.isDeleted = false')
      .andWhere("message.metadata->'tags' ?| array[:tags]", { tags });

    if (conversationId) {
      queryBuilder.andWhere('message.conversationId = :conversationId', { conversationId });
    }

    return queryBuilder
      .orderBy('message.timestamp', 'DESC')
      .take(limit)
      .skip(offset)
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('conversation.contact', 'contact')
      .getMany();
  }

  // Buscar mensagens por sentimento
  async findBySentiment(
    sentiment: 'positive' | 'negative' | 'neutral',
    conversationId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('message')
      .where('message.isDeleted = false')
      .andWhere("message.metadata->>'sentiment' = :sentiment", { sentiment });

    if (conversationId) {
      queryBuilder.andWhere('message.conversationId = :conversationId', { conversationId });
    }

    return queryBuilder
      .orderBy('message.timestamp', 'DESC')
      .take(limit)
      .skip(offset)
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('conversation.contact', 'contact')
      .getMany();
  }

  // Criar ou atualizar mensagem
  async createOrUpdate(messageData: Partial<Message>): Promise<Message> {
    if (messageData.whatsappId) {
      const existing = await this.findByWhatsAppId(messageData.whatsappId);
      if (existing) {
        // Atualizar mensagem existente
        existing.updateFromWhatsApp(messageData);
        return this.repository.save(existing);
      }
    }

    // Criar nova mensagem
    const message = this.repository.create(messageData);
    return this.repository.save(message);
  }

  // Salvar mensagem
  async save(message: Message): Promise<Message> {
    return this.repository.save(message);
  }

  // Atualizar mensagem
  async update(id: string, updateData: Partial<Message>): Promise<Message | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  // Buscar por ID
  async findById(id: string): Promise<Message | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['conversation', 'conversation.contact'],
    });
  }

  // Deletar mensagem (soft delete)
  async softDelete(id: string): Promise<void> {
    await this.repository.update(id, { 
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Deletar mensagem permanentemente
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  // Marcar/desmarcar com estrela
  async toggleStar(id: string): Promise<Message> {
    const message = await this.findById(id);
    if (!message) {
      throw new Error('Mensagem não encontrada');
    }
    
    message.isStarred = !message.isStarred;
    return this.repository.save(message);
  }

  // Adicionar reação
  async addReaction(id: string, emoji: string, author: string): Promise<Message> {
    const message = await this.findById(id);
    if (!message) {
      throw new Error('Mensagem não encontrada');
    }
    
    message.addReaction(emoji, author);
    return this.repository.save(message);
  }

  // Remover reação
  async removeReaction(id: string, author: string): Promise<Message> {
    const message = await this.findById(id);
    if (!message) {
      throw new Error('Mensagem não encontrada');
    }
    
    message.removeReaction(author);
    return this.repository.save(message);
  }

  // Adicionar tag
  async addTag(id: string, tag: string): Promise<Message> {
    const message = await this.findById(id);
    if (!message) {
      throw new Error('Mensagem não encontrada');
    }
    
    message.addTag(tag);
    return this.repository.save(message);
  }

  // Definir sentimento
  async setSentiment(id: string, sentiment: 'positive' | 'negative' | 'neutral'): Promise<Message> {
    const message = await this.findById(id);
    if (!message) {
      throw new Error('Mensagem não encontrada');
    }
    
    message.setSentiment(sentiment);
    return this.repository.save(message);
  }

  // Definir urgência
  async setUrgency(id: string, urgency: 'low' | 'medium' | 'high' | 'urgent'): Promise<Message> {
    const message = await this.findById(id);
    if (!message) {
      throw new Error('Mensagem não encontrada');
    }
    
    message.setUrgency(urgency);
    return this.repository.save(message);
  }

  // Definir transcrição
  async setTranscription(id: string, transcription: string, confidence: number, language: string = 'pt'): Promise<Message> {
    const message = await this.findById(id);
    if (!message) {
      throw new Error('Mensagem não encontrada');
    }
    
    message.setTranscription(transcription, confidence, language);
    return this.repository.save(message);
  }

  // Estatísticas
  async getStats(conversationId?: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    media: number;
    audio: number;
    transcribed: number;
    starred: number;
    forwarded: number;
    deleted: number;
    recent24h: number;
    recent7d: number;
  }> {
    const baseWhere = conversationId ? { conversationId } : {};

    const [
      total,
      media,
      audio,
      transcribed,
      starred,
      forwarded,
      deleted
    ] = await Promise.all([
      this.repository.count({ where: { ...baseWhere, isDeleted: false } }),
      this.findMediaMessages(conversationId, 1000).then(messages => messages.length),
      this.findAudioMessages(conversationId, 1000).then(messages => messages.length),
      this.findTranscribedMessages(conversationId, 1000).then(messages => messages.length),
      this.repository.count({ where: { ...baseWhere, isStarred: true, isDeleted: false } }),
      this.repository.count({ where: { ...baseWhere, isForwarded: true, isDeleted: false } }),
      this.repository.count({ where: { ...baseWhere, isDeleted: true } }),
    ]);

    // Estatísticas por tipo
    const typeStats = await this.repository
      .createQueryBuilder('message')
      .select('message.type, COUNT(*) as count')
      .where('message.isDeleted = false')
      .andWhere(conversationId ? 'message.conversationId = :conversationId' : '1=1', { conversationId })
      .groupBy('message.type')
      .getRawMany();

    const byType = typeStats.reduce((acc, stat) => {
      acc[stat.type] = parseInt(stat.count);
      return acc;
    }, {});

    // Estatísticas por status
    const statusStats = await this.repository
      .createQueryBuilder('message')
      .select('message.status, COUNT(*) as count')
      .where('message.isDeleted = false')
      .andWhere(conversationId ? 'message.conversationId = :conversationId' : '1=1', { conversationId })
      .groupBy('message.status')
      .getRawMany();

    const byStatus = statusStats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, {});

    // Mensagens recentes
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [recent24h, recent7d] = await Promise.all([
      this.repository.count({
        where: {
          ...baseWhere,
          timestamp: MoreThanOrEqual(yesterday),
          isDeleted: false
        }
      }),
      this.repository.count({
        where: {
          ...baseWhere,
          timestamp: MoreThanOrEqual(weekAgo),
          isDeleted: false
        }
      }),
    ]);

    return {
      total,
      byType,
      byStatus,
      media,
      audio,
      transcribed,
      starred,
      forwarded,
      deleted,
      recent24h,
      recent7d,
    };
  }

  // Busca avançada
  async search(query: {
    text?: string;
    conversationId?: string;
    type?: MessageType;
    fromMe?: boolean;
    author?: string;
    isStarred?: boolean;
    isForwarded?: boolean;
    hasTranscription?: boolean;
    sentiment?: string;
    urgency?: string;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ messages: Message[]; total: number }> {
    const queryBuilder = this.repository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('conversation.contact', 'contact')
      .where('message.isDeleted = false');

    if (query.text) {
      queryBuilder.andWhere(
        '(message.body ILIKE :text OR message.caption ILIKE :text OR message.transcription ILIKE :text)',
        { text: `%${query.text}%` }
      );
    }

    if (query.conversationId) {
      queryBuilder.andWhere('message.conversationId = :conversationId', { conversationId: query.conversationId });
    }

    if (query.type) {
      queryBuilder.andWhere('message.type = :type', { type: query.type });
    }

    if (query.fromMe !== undefined) {
      queryBuilder.andWhere('message.fromMe = :fromMe', { fromMe: query.fromMe });
    }

    if (query.author) {
      queryBuilder.andWhere('message.author = :author', { author: query.author });
    }

    if (query.isStarred !== undefined) {
      queryBuilder.andWhere('message.isStarred = :isStarred', { isStarred: query.isStarred });
    }

    if (query.isForwarded !== undefined) {
      queryBuilder.andWhere('message.isForwarded = :isForwarded', { isForwarded: query.isForwarded });
    }

    if (query.hasTranscription !== undefined) {
      if (query.hasTranscription) {
        queryBuilder.andWhere('message.transcription IS NOT NULL');
      } else {
        queryBuilder.andWhere('message.transcription IS NULL');
      }
    }

    if (query.sentiment) {
      queryBuilder.andWhere("message.metadata->>'sentiment' = :sentiment", { sentiment: query.sentiment });
    }

    if (query.urgency) {
      queryBuilder.andWhere("message.metadata->>'urgency' = :urgency", { urgency: query.urgency });
    }

    if (query.tags && query.tags.length > 0) {
      queryBuilder.andWhere("message.metadata->'tags' ?| array[:tags]", { tags: query.tags });
    }

    if (query.dateFrom) {
      queryBuilder.andWhere('message.timestamp >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      queryBuilder.andWhere('message.timestamp <= :dateTo', { dateTo: query.dateTo });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('message.timestamp', 'DESC')
      .limit(query.limit || 50)
      .offset(query.offset || 0);

    const messages = await queryBuilder.getMany();

    return { messages, total };
  }
}

