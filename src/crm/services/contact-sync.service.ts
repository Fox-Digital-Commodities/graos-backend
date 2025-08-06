import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { Contact } from '../whatsapp/entities/contact.entity';
import { Conversation } from '../whatsapp/entities/conversation.entity';
import { Message } from '../whatsapp/entities/message.entity';
import { KanbanBoard } from './entities/kanban-board.entity';
import { KanbanColumn } from './entities/kanban-column.entity';
import { KanbanCard } from './entities/kanban-card.entity';
import { SyncContactsDto, CreateBoardFromConversationsDto, ImportContactDto } from './dto/sync-contacts.dto';

@Injectable()
export class ContactSyncService {
  private readonly logger = new Logger(ContactSyncService.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(KanbanBoard)
    private kanbanBoardRepository: Repository<KanbanBoard>,
    @InjectRepository(KanbanColumn)
    private kanbanColumnRepository: Repository<KanbanColumn>,
    @InjectRepository(KanbanCard)
    private kanbanCardRepository: Repository<KanbanCard>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async syncContactsFromMaytapi(syncDto: SyncContactsDto) {
    this.logger.log(`Iniciando sincronização de contatos para instância ${syncDto.instanceId}`);

    try {
      // 1. Buscar conversas da API Maytapi
      const conversations = await this.fetchConversationsFromMaytapi(syncDto.instanceId, syncDto.limit);
      
      // 2. Processar e salvar contatos
      const importedContacts = [];
      for (const conversation of conversations) {
        const contact = await this.processAndSaveContact(conversation, syncDto.instanceId);
        if (contact) {
          importedContacts.push(contact);
        }
      }

      // 3. Buscar mensagens para cada conversa
      for (const contact of importedContacts) {
        if (contact.conversationId) {
          await this.syncMessagesForConversation(contact.conversationId, syncDto.instanceId);
        }
      }

      this.logger.log(`Sincronização concluída: ${importedContacts.length} contatos processados`);

      return {
        success: true,
        contactsProcessed: importedContacts.length,
        contacts: importedContacts,
      };
    } catch (error) {
      this.logger.error(`Erro na sincronização: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro na sincronização: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async fetchConversationsFromMaytapi(instanceId: string, limit: number = 100) {
    const maytapiUrl = this.configService.get('MAYTAPI_URL') || 'https://api.maytapi.com/api';
    const maytapiToken = this.configService.get('MAYTAPI_TOKEN');

    if (!maytapiToken) {
      throw new Error('MAYTAPI_TOKEN não configurado');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${maytapiUrl}/${instanceId}/listChats`, {
          headers: {
            'x-maytapi-key': maytapiToken,
          },
          params: {
            limit,
            type: 'all', // individual, group, all
          },
        }),
      );

      return response.data.data || [];
    } catch (error) {
      this.logger.error(`Erro ao buscar conversas do Maytapi: ${error.message}`);
      throw error;
    }
  }

  private async processAndSaveContact(conversationData: any, instanceId: string): Promise<Contact | null> {
    try {
      // Extrair dados do contato da conversa
      const phoneNumber = this.extractPhoneNumber(conversationData.id);
      const name = conversationData.name || conversationData.pushname || phoneNumber;
      
      // Verificar se já existe
      let contact = await this.contactRepository.findOne({
        where: { phoneNumber, instanceId },
      });

      if (!contact) {
        // Criar novo contato
        contact = this.contactRepository.create({
          phoneNumber,
          name,
          instanceId,
          profilePicture: conversationData.profilePicture,
          status: conversationData.status,
          lastSeen: conversationData.lastSeen ? new Date(conversationData.lastSeen * 1000) : null,
          isGroup: conversationData.isGroup || false,
          conversationId: conversationData.id,
          messageCount: conversationData.unreadCount || 0,
          lastMessageAt: conversationData.lastMessageTime ? new Date(conversationData.lastMessageTime * 1000) : null,
          lastMessageText: conversationData.lastMessage?.body || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Atualizar contato existente
        contact.name = name;
        contact.profilePicture = conversationData.profilePicture || contact.profilePicture;
        contact.status = conversationData.status || contact.status;
        contact.lastSeen = conversationData.lastSeen ? new Date(conversationData.lastSeen * 1000) : contact.lastSeen;
        contact.messageCount = conversationData.unreadCount || contact.messageCount;
        contact.lastMessageAt = conversationData.lastMessageTime ? new Date(conversationData.lastMessageTime * 1000) : contact.lastMessageAt;
        contact.lastMessageText = conversationData.lastMessage?.body || contact.lastMessageText;
        contact.updatedAt = new Date();
      }

      // Salvar contato
      contact = await this.contactRepository.save(contact);

      // Criar ou atualizar conversa
      await this.createOrUpdateConversation(contact, conversationData, instanceId);

      return contact;
    } catch (error) {
      this.logger.error(`Erro ao processar contato: ${error.message}`, error.stack);
      return null;
    }
  }

  private extractPhoneNumber(chatId: string): string {
    // Formato típico: "5511999999999@c.us" ou "5511999999999@g.us"
    return chatId.split('@')[0];
  }

  private async createOrUpdateConversation(contact: Contact, conversationData: any, instanceId: string) {
    let conversation = await this.conversationRepository.findOne({
      where: { contactId: contact.id, instanceId },
    });

    if (!conversation) {
      conversation = this.conversationRepository.create({
        contactId: contact.id,
        instanceId,
        status: 'active',
        lastMessageAt: contact.lastMessageAt,
        messageCount: contact.messageCount,
        isGroup: contact.isGroup,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      conversation.lastMessageAt = contact.lastMessageAt;
      conversation.messageCount = contact.messageCount;
      conversation.updatedAt = new Date();
    }

    await this.conversationRepository.save(conversation);
  }

  private async syncMessagesForConversation(conversationId: string, instanceId: string, limit: number = 50) {
    const maytapiUrl = this.configService.get('MAYTAPI_URL') || 'https://api.maytapi.com/api';
    const maytapiToken = this.configService.get('MAYTAPI_TOKEN');

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${maytapiUrl}/${instanceId}/listMessages`, {
          headers: {
            'x-maytapi-key': maytapiToken,
          },
          params: {
            chatId: conversationId,
            limit,
          },
        }),
      );

      const messages = response.data.data || [];
      
      for (const messageData of messages) {
        await this.processAndSaveMessage(messageData, conversationId, instanceId);
      }

      this.logger.log(`${messages.length} mensagens sincronizadas para conversa ${conversationId}`);
    } catch (error) {
      this.logger.error(`Erro ao sincronizar mensagens: ${error.message}`);
    }
  }

  private async processAndSaveMessage(messageData: any, conversationId: string, instanceId: string) {
    try {
      // Verificar se mensagem já existe
      const existingMessage = await this.messageRepository.findOne({
        where: { messageId: messageData.id, instanceId },
      });

      if (existingMessage) {
        return; // Mensagem já existe
      }

      // Criar nova mensagem
      const message = this.messageRepository.create({
        messageId: messageData.id,
        conversationId,
        instanceId,
        text: messageData.body || '',
        type: this.getMessageType(messageData),
        fromMe: messageData.fromMe || false,
        timestamp: new Date(messageData.timestamp * 1000),
        mediaUrl: messageData.mediaUrl,
        mediaType: messageData.type,
        fileName: messageData.fileName,
        fileSize: messageData.fileSize,
        duration: messageData.duration,
        isForwarded: messageData.isForwarded || false,
        quotedMessageId: messageData.quotedMessage?.id,
        createdAt: new Date(),
      });

      await this.messageRepository.save(message);
    } catch (error) {
      this.logger.error(`Erro ao processar mensagem: ${error.message}`);
    }
  }

  private getMessageType(messageData: any): string {
    if (messageData.type === 'chat') return 'text';
    if (messageData.type === 'image') return 'image';
    if (messageData.type === 'audio' || messageData.type === 'ptt') return 'audio';
    if (messageData.type === 'video') return 'video';
    if (messageData.type === 'document') return 'document';
    if (messageData.type === 'sticker') return 'sticker';
    if (messageData.type === 'location') return 'location';
    if (messageData.type === 'contact') return 'contact';
    return 'other';
  }

  async createBoardFromConversations(createBoardDto: CreateBoardFromConversationsDto) {
    this.logger.log(`Criando board ${createBoardDto.name} do tipo ${createBoardDto.type}`);

    try {
      // 1. Criar board
      const board = await this.createKanbanBoard(createBoardDto);

      // 2. Criar colunas padrão
      const columns = await this.createDefaultColumns(board, createBoardDto.type);

      // 3. Buscar conversas relevantes
      const conversations = await this.findRelevantConversations(createBoardDto);

      // 4. Criar cards das conversas
      const cards = await this.createCardsFromConversations(conversations, columns, createBoardDto.type);

      this.logger.log(`Board criado com sucesso: ${cards.length} cards adicionados`);

      return {
        success: true,
        board,
        columns,
        cards,
        totalCards: cards.length,
      };
    } catch (error) {
      this.logger.error(`Erro ao criar board: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao criar board: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async createKanbanBoard(createBoardDto: CreateBoardFromConversationsDto): Promise<KanbanBoard> {
    const board = this.kanbanBoardRepository.create({
      name: createBoardDto.name,
      description: createBoardDto.description || `Board de ${createBoardDto.type}`,
      type: createBoardDto.type as any,
      settings: {
        autoAssignCards: true,
        enableTimeTracking: true,
        enableComments: true,
        enableAttachments: true,
        enableDueDates: true,
        enableLabels: true,
        maxCardsPerColumn: 50,
        defaultPriority: 'normal',
      },
      appearance: {
        backgroundColor: this.getBoardColor(createBoardDto.type),
        cardStyle: 'detailed',
        showAssignees: true,
        showDueDates: true,
        showPriority: true,
        showLabels: true,
        columnWidth: 320,
      },
      permissions: {
        viewers: [],
        editors: [],
        admins: [],
        teams: [],
        whatsappInstances: [createBoardDto.instanceId],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.kanbanBoardRepository.save(board);
  }

  private getBoardColor(type: string): string {
    const colors = {
      logistics: '#f0f9ff', // Azul claro
      commercial: '#f0fdf4', // Verde claro
      support: '#fefce8', // Amarelo claro
      default: '#f8fafc', // Cinza claro
    };
    return colors[type] || colors.default;
  }

  private async createDefaultColumns(board: KanbanBoard, type: string): Promise<KanbanColumn[]> {
    const columnConfigs = this.getDefaultColumnsForType(type);
    const columns = [];

    for (let i = 0; i < columnConfigs.length; i++) {
      const config = columnConfigs[i];
      const column = this.kanbanColumnRepository.create({
        boardId: board.id,
        name: config.name,
        type: config.type as any,
        position: i,
        color: config.color,
        wipLimit: config.wipLimit,
        settings: {
          autoMoveRules: config.autoMoveRules || [],
          escalationRules: config.escalationRules || [],
          notificationRules: config.notificationRules || [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      columns.push(await this.kanbanColumnRepository.save(column));
    }

    return columns;
  }

  private getDefaultColumnsForType(type: string) {
    const configs = {
      logistics: [
        { name: 'Novas Solicitações', type: 'backlog', color: '#3B82F6', wipLimit: 20 },
        { name: 'Em Análise', type: 'todo', color: '#F59E0B', wipLimit: 15 },
        { name: 'Em Transporte', type: 'in_progress', color: '#8B5CF6', wipLimit: 10 },
        { name: 'Entregue', type: 'done', color: '#10B981', wipLimit: null },
      ],
      commercial: [
        { name: 'Novos Leads', type: 'backlog', color: '#3B82F6', wipLimit: 30 },
        { name: 'Qualificação', type: 'todo', color: '#F59E0B', wipLimit: 20 },
        { name: 'Negociação', type: 'in_progress', color: '#EF4444', wipLimit: 15 },
        { name: 'Proposta Enviada', type: 'review', color: '#8B5CF6', wipLimit: 10 },
        { name: 'Fechado', type: 'done', color: '#10B981', wipLimit: null },
      ],
      support: [
        { name: 'Novos Tickets', type: 'backlog', color: '#3B82F6', wipLimit: 25 },
        { name: 'Em Atendimento', type: 'in_progress', color: '#F59E0B', wipLimit: 15 },
        { name: 'Aguardando Cliente', type: 'review', color: '#8B5CF6', wipLimit: 10 },
        { name: 'Resolvido', type: 'done', color: '#10B981', wipLimit: null },
      ],
    };

    return configs[type] || configs.support;
  }

  private async findRelevantConversations(createBoardDto: CreateBoardFromConversationsDto) {
    const queryBuilder = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.contact', 'contact')
      .leftJoinAndSelect('conversation.messages', 'messages')
      .where('conversation.instanceId = :instanceId', { instanceId: createBoardDto.instanceId })
      .andWhere('conversation.status = :status', { status: 'active' })
      .orderBy('conversation.lastMessageAt', 'DESC')
      .limit(100);

    // Filtrar por palavras-chave se fornecidas
    if (createBoardDto.keywords && createBoardDto.keywords.length > 0) {
      const keywordConditions = createBoardDto.keywords
        .map((keyword, index) => `messages.text ILIKE :keyword${index}`)
        .join(' OR ');
      
      queryBuilder.andWhere(`(${keywordConditions})`, 
        createBoardDto.keywords.reduce((params, keyword, index) => {
          params[`keyword${index}`] = `%${keyword}%`;
          return params;
        }, {})
      );
    }

    // Excluir por palavras-chave se fornecidas
    if (createBoardDto.excludeKeywords && createBoardDto.excludeKeywords.length > 0) {
      const excludeConditions = createBoardDto.excludeKeywords
        .map((keyword, index) => `messages.text NOT ILIKE :excludeKeyword${index}`)
        .join(' AND ');
      
      queryBuilder.andWhere(`(${excludeConditions})`, 
        createBoardDto.excludeKeywords.reduce((params, keyword, index) => {
          params[`excludeKeyword${index}`] = `%${keyword}%`;
          return params;
        }, {})
      );
    }

    return await queryBuilder.getMany();
  }

  private async createCardsFromConversations(
    conversations: Conversation[],
    columns: KanbanColumn[],
    boardType: string,
  ): Promise<KanbanCard[]> {
    const cards = [];
    const firstColumn = columns[0]; // Primeira coluna (Novas/Backlog)

    for (const conversation of conversations) {
      try {
        const card = await this.createCardFromConversation(conversation, firstColumn, boardType);
        if (card) {
          cards.push(card);
        }
      } catch (error) {
        this.logger.error(`Erro ao criar card da conversa ${conversation.id}: ${error.message}`);
      }
    }

    return cards;
  }

  private async createCardFromConversation(
    conversation: Conversation,
    column: KanbanColumn,
    boardType: string,
  ): Promise<KanbanCard | null> {
    if (!conversation.contact) {
      return null;
    }

    const contact = conversation.contact;
    const lastMessage = conversation.messages?.[0];

    // Determinar prioridade baseada no tipo de board e conteúdo
    const priority = this.determinePriority(lastMessage?.text || '', boardType);

    // Gerar título baseado no tipo de board
    const title = this.generateCardTitle(contact, lastMessage, boardType);

    // Gerar descrição
    const description = this.generateCardDescription(conversation, boardType);

    // Gerar labels baseadas no conteúdo
    const labels = this.generateLabels(lastMessage?.text || '', boardType);

    const card = this.kanbanCardRepository.create({
      columnId: column.id,
      title,
      description,
      type: 'conversation',
      priority,
      status: 'active',
      position: await this.getNextCardPosition(column.id),
      conversationId: conversation.id.toString(),
      contactName: contact.name,
      contactPhone: contact.phoneNumber,
      instanceId: conversation.instanceId,
      labels,
      dueDate: this.calculateDueDate(priority, boardType),
      estimatedHours: this.estimateHours(boardType),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await this.kanbanCardRepository.save(card);
  }

  private determinePriority(messageText: string, boardType: string): string {
    const urgentKeywords = ['urgente', 'emergência', 'imediato', 'rápido', 'hoje'];
    const highKeywords = ['importante', 'prioridade', 'amanhã'];

    const text = messageText.toLowerCase();

    if (urgentKeywords.some(keyword => text.includes(keyword))) {
      return 'urgent';
    }

    if (highKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    }

    // Prioridade baseada no tipo de board
    if (boardType === 'commercial') {
      const commercialHighKeywords = ['comprar', 'cotação', 'preço', 'proposta'];
      if (commercialHighKeywords.some(keyword => text.includes(keyword))) {
        return 'high';
      }
    }

    return 'normal';
  }

  private generateCardTitle(contact: Contact, lastMessage: any, boardType: string): string {
    const baseName = contact.name || contact.phoneNumber;

    if (boardType === 'logistics') {
      return `Logística - ${baseName}`;
    }

    if (boardType === 'commercial') {
      return `Comercial - ${baseName}`;
    }

    return `Atendimento - ${baseName}`;
  }

  private generateCardDescription(conversation: Conversation, boardType: string): string {
    const contact = conversation.contact;
    const lastMessage = conversation.messages?.[0];

    let description = `Cliente: ${contact.name}\nTelefone: ${contact.phoneNumber}\n`;

    if (lastMessage) {
      description += `\nÚltima mensagem: ${lastMessage.text.substring(0, 200)}`;
      if (lastMessage.text.length > 200) {
        description += '...';
      }
    }

    if (conversation.messageCount > 0) {
      description += `\n\nTotal de mensagens: ${conversation.messageCount}`;
    }

    return description;
  }

  private generateLabels(messageText: string, boardType: string): string[] {
    const labels = [];
    const text = messageText.toLowerCase();

    // Labels gerais
    if (text.includes('urgente')) labels.push('Urgente');
    if (text.includes('importante')) labels.push('Importante');

    // Labels por tipo de board
    if (boardType === 'logistics') {
      if (text.includes('entrega')) labels.push('Entrega');
      if (text.includes('transporte')) labels.push('Transporte');
      if (text.includes('frete')) labels.push('Frete');
      if (text.includes('prazo')) labels.push('Prazo');
    }

    if (boardType === 'commercial') {
      if (text.includes('cotação') || text.includes('preço')) labels.push('Cotação');
      if (text.includes('compra') || text.includes('pedido')) labels.push('Pedido');
      if (text.includes('proposta')) labels.push('Proposta');
      if (text.includes('desconto')) labels.push('Desconto');
    }

    // Labels de produtos (grãos)
    if (text.includes('soja')) labels.push('Soja');
    if (text.includes('milho')) labels.push('Milho');
    if (text.includes('trigo')) labels.push('Trigo');
    if (text.includes('arroz')) labels.push('Arroz');

    return labels;
  }

  private calculateDueDate(priority: string, boardType: string): Date | null {
    const now = new Date();
    const daysToAdd = {
      urgent: 1,
      high: 3,
      normal: 7,
      low: 14,
    };

    const days = daysToAdd[priority] || 7;
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + days);

    return dueDate;
  }

  private estimateHours(boardType: string): number | null {
    const estimates = {
      logistics: 4,
      commercial: 6,
      support: 2,
    };

    return estimates[boardType] || 3;
  }

  private async getNextCardPosition(columnId: string): Promise<number> {
    const lastCard = await this.kanbanCardRepository
      .createQueryBuilder('card')
      .where('card.columnId = :columnId', { columnId })
      .orderBy('card.position', 'DESC')
      .getOne();

    return lastCard ? lastCard.position + 1 : 0;
  }
}

