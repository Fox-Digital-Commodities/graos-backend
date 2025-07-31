import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, MoreThan } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';

@Injectable()
export class ConversationRepository {
  constructor(
    @InjectRepository(Conversation)
    private readonly repository: Repository<Conversation>,
  ) {}

  // Buscar por WhatsApp ID
  async findByWhatsAppId(whatsappId: string): Promise<Conversation | null> {
    return this.repository.findOne({
      where: { whatsappId },
      relations: ['contact', 'messages'],
    });
  }

  // Buscar por ID do contato
  async findByContactId(contactId: string): Promise<Conversation[]> {
    return this.repository.find({
      where: { contactId, isActive: true },
      relations: ['contact'],
      order: { lastMessageAt: 'DESC' },
    });
  }

  // Buscar todas as conversas ativas
  async findAllActive(): Promise<Conversation[]> {
    return this.repository.find({
      where: { isActive: true },
      relations: ['contact'],
      order: { lastMessageAt: 'DESC' },
    });
  }

  // Buscar conversas recentes (com mensagens nas últimas 24h)
  async findRecent(): Promise<Conversation[]> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.repository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.contact', 'contact')
      .where('conversation.isActive = :isActive', { isActive: true })
      .andWhere('conversation.lastMessageAt >= :yesterday', { yesterday })
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();
  }

  // Buscar conversas não lidas
  async findUnread(): Promise<Conversation[]> {
    return this.repository.find({
      where: { 
        unreadCount: MoreThan(0),
        isActive: true 
      },
      relations: ['contact'],
      order: { lastMessageAt: 'DESC' },
    });
  }

  // Buscar conversas fixadas
  async findPinned(): Promise<Conversation[]> {
    return this.repository.find({
      where: { isPinned: true, isActive: true },
      relations: ['contact'],
      order: { lastMessageAt: 'DESC' },
    });
  }

  // Buscar conversas arquivadas
  async findArchived(): Promise<Conversation[]> {
    return this.repository.find({
      where: { isArchived: true, isActive: true },
      relations: ['contact'],
      order: { lastMessageAt: 'DESC' },
    });
  }

  // Buscar grupos
  async findGroups(): Promise<Conversation[]> {
    return this.repository.find({
      where: { isGroup: true, isActive: true },
      relations: ['contact'],
      order: { lastMessageAt: 'DESC' },
    });
  }

  // Buscar por etiquetas
  async findByLabels(labels: string[]): Promise<Conversation[]> {
    return this.repository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.contact', 'contact')
      .where('conversation.isActive = :isActive', { isActive: true })
      .andWhere('conversation.labels && :labels', { labels })
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();
  }

  // Buscar por status
  async findByStatus(status: 'open' | 'pending' | 'resolved' | 'closed'): Promise<Conversation[]> {
    return this.repository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.contact', 'contact')
      .where('conversation.isActive = :isActive', { isActive: true })
      .andWhere("conversation.metadata->>'status' = :status", { status })
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();
  }

  // Buscar por prioridade
  async findByPriority(priority: 'low' | 'medium' | 'high' | 'urgent'): Promise<Conversation[]> {
    return this.repository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.contact', 'contact')
      .where('conversation.isActive = :isActive', { isActive: true })
      .andWhere("conversation.metadata->>'priority' = :priority", { priority })
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();
  }

  // Criar ou atualizar conversa
  async createOrUpdate(conversationData: Partial<Conversation>): Promise<Conversation> {
    if (conversationData.whatsappId) {
      const existing = await this.findByWhatsAppId(conversationData.whatsappId);
      if (existing) {
        // Atualizar conversa existente
        existing.updateFromWhatsApp(conversationData);
        return this.repository.save(existing);
      }
    }

    // Criar nova conversa
    const conversation = this.repository.create(conversationData);
    return this.repository.save(conversation);
  }

  // Salvar conversa
  async save(conversation: Conversation): Promise<Conversation> {
    return this.repository.save(conversation);
  }

  // Atualizar conversa
  async update(id: string, updateData: Partial<Conversation>): Promise<Conversation | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  // Buscar por ID
  async findById(id: string): Promise<Conversation | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['contact', 'messages'],
    });
  }

  // Deletar conversa (soft delete)
  async softDelete(id: string): Promise<void> {
    await this.repository.update(id, { 
      isActive: false,
      updatedAt: new Date()
    });
  }

  // Deletar conversa permanentemente
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  // Marcar como lida
  async markAsRead(id: string): Promise<Conversation> {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }
    
    conversation.markAsRead();
    return this.repository.save(conversation);
  }

  // Fixar/desfixar conversa
  async togglePin(id: string): Promise<Conversation> {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }
    
    conversation.isPinned = !conversation.isPinned;
    return this.repository.save(conversation);
  }

  // Arquivar/desarquivar conversa
  async toggleArchive(id: string): Promise<Conversation> {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }
    
    conversation.isArchived = !conversation.isArchived;
    return this.repository.save(conversation);
  }

  // Silenciar/desilenciar conversa
  async toggleMute(id: string): Promise<Conversation> {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }
    
    conversation.isMuted = !conversation.isMuted;
    return this.repository.save(conversation);
  }

  // Definir prioridade
  async setPriority(id: string, priority: 'low' | 'medium' | 'high' | 'urgent'): Promise<Conversation> {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }
    
    conversation.setPriority(priority);
    return this.repository.save(conversation);
  }

  // Definir status
  async setStatus(id: string, status: 'open' | 'pending' | 'resolved' | 'closed'): Promise<Conversation> {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }
    
    conversation.setStatus(status);
    return this.repository.save(conversation);
  }

  // Adicionar etiqueta
  async addLabel(id: string, label: string): Promise<Conversation> {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }
    
    if (!conversation.labels) conversation.labels = [];
    if (!conversation.labels.includes(label)) {
      conversation.labels.push(label);
      return this.repository.save(conversation);
    }
    
    return conversation;
  }

  // Remover etiqueta
  async removeLabel(id: string, label: string): Promise<Conversation> {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }
    
    if (conversation.labels) {
      conversation.labels = conversation.labels.filter(l => l !== label);
      return this.repository.save(conversation);
    }
    
    return conversation;
  }

  // Adicionar tag
  async addTag(id: string, tag: string): Promise<Conversation> {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }
    
    conversation.addTag(tag);
    return this.repository.save(conversation);
  }

  // Remover tag
  async removeTag(id: string, tag: string): Promise<Conversation> {
    const conversation = await this.findById(id);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }
    
    conversation.removeTag(tag);
    return this.repository.save(conversation);
  }

  // Estatísticas
  async getStats(): Promise<{
    total: number;
    active: number;
    unread: number;
    pinned: number;
    archived: number;
    groups: number;
    recent: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const [
      total,
      active,
      unread,
      pinned,
      archived,
      groups,
      recent
    ] = await Promise.all([
      this.repository.count(),
      this.repository.count({ where: { isActive: true } }),
      this.repository.count({ where: { unreadCount: MoreThan(0), isActive: true } }),
      this.repository.count({ where: { isPinned: true, isActive: true } }),
      this.repository.count({ where: { isArchived: true, isActive: true } }),
      this.repository.count({ where: { isGroup: true, isActive: true } }),
      this.findRecent().then(conversations => conversations.length),
    ]);

    // Estatísticas por status
    const statusStats = await this.repository
      .createQueryBuilder('conversation')
      .select("conversation.metadata->>'status' as status, COUNT(*) as count")
      .where('conversation.isActive = :isActive', { isActive: true })
      .andWhere("conversation.metadata->>'status' IS NOT NULL")
      .groupBy("conversation.metadata->>'status'")
      .getRawMany();

    const byStatus = statusStats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, {});

    // Estatísticas por prioridade
    const priorityStats = await this.repository
      .createQueryBuilder('conversation')
      .select("conversation.metadata->>'priority' as priority, COUNT(*) as count")
      .where('conversation.isActive = :isActive', { isActive: true })
      .andWhere("conversation.metadata->>'priority' IS NOT NULL")
      .groupBy("conversation.metadata->>'priority'")
      .getRawMany();

    const byPriority = priorityStats.reduce((acc, stat) => {
      acc[stat.priority] = parseInt(stat.count);
      return acc;
    }, {});

    return {
      total,
      active,
      unread,
      pinned,
      archived,
      groups,
      recent,
      byStatus,
      byPriority,
    };
  }

  // Busca avançada
  async search(query: {
    contactName?: string;
    title?: string;
    isGroup?: boolean;
    isPinned?: boolean;
    isArchived?: boolean;
    unreadOnly?: boolean;
    status?: string;
    priority?: string;
    labels?: string[];
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ conversations: Conversation[]; total: number }> {
    const queryBuilder = this.repository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.contact', 'contact')
      .where('conversation.isActive = :isActive', { isActive: true });

    if (query.contactName) {
      queryBuilder.andWhere(
        '(contact.displayName ILIKE :contactName OR contact.pushName ILIKE :contactName)',
        { contactName: `%${query.contactName}%` }
      );
    }

    if (query.title) {
      queryBuilder.andWhere('conversation.title ILIKE :title', {
        title: `%${query.title}%`
      });
    }

    if (query.isGroup !== undefined) {
      queryBuilder.andWhere('conversation.isGroup = :isGroup', { isGroup: query.isGroup });
    }

    if (query.isPinned !== undefined) {
      queryBuilder.andWhere('conversation.isPinned = :isPinned', { isPinned: query.isPinned });
    }

    if (query.isArchived !== undefined) {
      queryBuilder.andWhere('conversation.isArchived = :isArchived', { isArchived: query.isArchived });
    }

    if (query.unreadOnly) {
      queryBuilder.andWhere('conversation.unreadCount > 0');
    }

    if (query.status) {
      queryBuilder.andWhere("conversation.metadata->>'status' = :status", { status: query.status });
    }

    if (query.priority) {
      queryBuilder.andWhere("conversation.metadata->>'priority' = :priority", { priority: query.priority });
    }

    if (query.labels && query.labels.length > 0) {
      queryBuilder.andWhere('conversation.labels && :labels', { labels: query.labels });
    }

    if (query.tags && query.tags.length > 0) {
      queryBuilder.andWhere("conversation.metadata->'tags' ?| array[:tags]", { tags: query.tags });
    }

    if (query.dateFrom) {
      queryBuilder.andWhere('conversation.lastMessageAt >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      queryBuilder.andWhere('conversation.lastMessageAt <= :dateTo', { dateTo: query.dateTo });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('conversation.lastMessageAt', 'DESC')
      .limit(query.limit || 50)
      .offset(query.offset || 0);

    const conversations = await queryBuilder.getMany();

    return { conversations, total };
  }
}

