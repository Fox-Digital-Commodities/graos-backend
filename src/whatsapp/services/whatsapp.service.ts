import { Injectable, Logger } from '@nestjs/common';
import { ContactRepository } from '../repositories/contact.repository';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';
import { Contact } from '../entities/contact.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message, MessageType } from '../entities/message.entity';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
  ) {}

  // ===== CONTATOS =====

  async saveContact(contactData: any): Promise<Contact> {
    try {
      this.logger.log(`Salvando contato: ${contactData.whatsappId || contactData.id}`);
      
      const contact = await this.contactRepository.createOrUpdate({
        whatsappId: contactData.id || contactData.whatsappId,
        phoneNumber: contactData.number || contactData.phoneNumber,
        displayName: contactData.name || contactData.displayName,
        pushName: contactData.pushname || contactData.pushName,
        profilePictureUrl: contactData.profilePicUrl || contactData.profilePictureUrl,
        isBusiness: contactData.isBusiness || false,
        isGroup: contactData.isGroup || false,
        groupParticipants: contactData.groupParticipants || null,
        statusMessage: contactData.statusMessage || contactData.status,
        labels: contactData.labels || [],
        metadata: contactData.metadata || {},
      });

      this.logger.log(`Contato salvo: ${contact.id}`);
      return contact;
    } catch (error) {
      this.logger.error(`Erro ao salvar contato: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getContact(whatsappId: string): Promise<Contact | null> {
    return this.contactRepository.findByWhatsAppId(whatsappId);
  }

  async getAllContacts(): Promise<Contact[]> {
    return this.contactRepository.findAllActive();
  }

  async searchContacts(query: string): Promise<Contact[]> {
    return this.contactRepository.findByName(query);
  }

  // ===== CONVERSAS =====

  async saveConversation(conversationData: any, contactId?: string): Promise<Conversation> {
    try {
      this.logger.log(`Salvando conversa: ${conversationData.whatsappId || conversationData.id}`);
      
      // Se não temos contactId, tentar encontrar pelo whatsappId da conversa
      if (!contactId && conversationData.id) {
        const contact = await this.contactRepository.findByWhatsAppId(conversationData.id);
        contactId = contact?.id;
      }

      if (!contactId) {
        throw new Error('Contact ID é obrigatório para salvar conversa');
      }

      const conversation = await this.conversationRepository.createOrUpdate({
        whatsappId: conversationData.id || conversationData.whatsappId,
        contactId,
        title: conversationData.name || conversationData.title,
        description: conversationData.description,
        isGroup: conversationData.isGroup || false,
        isMuted: conversationData.isMuted || false,
        isPinned: conversationData.isPinned || false,
        isArchived: conversationData.isArchived || false,
        unreadCount: conversationData.unreadCount || 0,
        participantCount: conversationData.participantCount || 0,
        labels: conversationData.labels || [],
        metadata: conversationData.metadata || {},
      });

      this.logger.log(`Conversa salva: ${conversation.id}`);
      return conversation;
    } catch (error) {
      this.logger.error(`Erro ao salvar conversa: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getConversation(whatsappId: string): Promise<Conversation | null> {
    return this.conversationRepository.findByWhatsAppId(whatsappId);
  }

  async getAllConversations(): Promise<Conversation[]> {
    return this.conversationRepository.findAllActive();
  }

  async getRecentConversations(): Promise<Conversation[]> {
    return this.conversationRepository.findRecent();
  }

  async getUnreadConversations(): Promise<Conversation[]> {
    return this.conversationRepository.findUnread();
  }

  // ===== MENSAGENS =====

  async saveMessage(messageData: any, conversationId?: string): Promise<Message> {
    try {
      this.logger.log(`Salvando mensagem: ${messageData.whatsappId || messageData.id}`);
      
      // Se não temos conversationId, tentar encontrar pela conversa
      if (!conversationId && messageData.from) {
        const conversation = await this.conversationRepository.findByWhatsAppId(messageData.from);
        conversationId = conversation?.id;
      }

      if (!conversationId) {
        throw new Error('Conversation ID é obrigatório para salvar mensagem');
      }

      // Determinar tipo da mensagem
      const messageType = this.determineMessageType(messageData);

      const message = await this.messageRepository.createOrUpdate({
        whatsappId: messageData.id || messageData.whatsappId,
        conversationId,
        fromMe: messageData.fromMe || false,
        author: messageData.author,
        type: messageType,
        body: messageData.body || messageData.text,
        caption: messageData.caption,
        timestamp: messageData.timestamp ? new Date(messageData.timestamp * 1000) : new Date(),
        isForwarded: messageData.isForwarded || false,
        forwardCount: messageData.forwardingScore || 0,
        isStarred: messageData.isStarred || false,
        isBroadcast: messageData.broadcast || false,
        quotedMessageId: messageData.quotedMsgId,
        quotedMessageBody: messageData.quotedMsg?.body,
        mediaUrl: messageData.mediaUrl || messageData.url,
        mediaMimeType: messageData.mimetype,
        mediaSize: messageData.filesize,
        mediaFilename: messageData.filename,
        mediaDuration: messageData.duration,
        mediaWidth: messageData.width,
        mediaHeight: messageData.height,
        locationLatitude: messageData.location?.latitude,
        locationLongitude: messageData.location?.longitude,
        locationDescription: messageData.location?.description,
        contactVcard: messageData.vCards?.[0],
        metadata: {
          mentions: messageData.mentionedIds || [],
          links: this.extractLinks(messageData.body || ''),
          ...messageData.metadata
        },
      });

      // Atualizar última mensagem da conversa
      const conversation = await this.conversationRepository.findById(conversationId);
      if (conversation) {
        conversation.updateLastMessage(message);
        if (!messageData.fromMe) {
          conversation.incrementUnreadCount();
        }
        await this.conversationRepository.save(conversation);
      }

      this.logger.log(`Mensagem salva: ${message.id}`);
      return message;
    } catch (error) {
      this.logger.error(`Erro ao salvar mensagem: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getMessage(whatsappId: string): Promise<Message | null> {
    return this.messageRepository.findByWhatsAppId(whatsappId);
  }

  async getConversationMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    return this.messageRepository.findByConversationId(conversationId, limit, offset);
  }

  async getRecentMessages(conversationId: string, limit: number = 20): Promise<Message[]> {
    return this.messageRepository.findRecentByConversationId(conversationId, limit);
  }

  async searchMessages(query: string, conversationId?: string): Promise<Message[]> {
    return this.messageRepository.searchByText(query, conversationId);
  }

  // ===== PROCESSAMENTO EM LOTE =====

  async saveWhatsAppData(data: {
    contacts?: any[];
    conversations?: any[];
    messages?: any[];
  }): Promise<{
    contacts: Contact[];
    conversations: Conversation[];
    messages: Message[];
  }> {
    const results = {
      contacts: [] as Contact[],
      conversations: [] as Conversation[],
      messages: [] as Message[],
    };

    try {
      // Salvar contatos primeiro
      if (data.contacts?.length) {
        this.logger.log(`Salvando ${data.contacts.length} contatos`);
        for (const contactData of data.contacts) {
          try {
            const contact = await this.saveContact(contactData);
            results.contacts.push(contact);
          } catch (error) {
            this.logger.warn(`Erro ao salvar contato ${contactData.id}: ${error.message}`);
          }
        }
      }

      // Salvar conversas
      if (data.conversations?.length) {
        this.logger.log(`Salvando ${data.conversations.length} conversas`);
        for (const conversationData of data.conversations) {
          try {
            // Encontrar contato correspondente
            const contact = await this.contactRepository.findByWhatsAppId(conversationData.id);
            if (contact) {
              const conversation = await this.saveConversation(conversationData, contact.id);
              results.conversations.push(conversation);
            } else {
              this.logger.warn(`Contato não encontrado para conversa ${conversationData.id}`);
            }
          } catch (error) {
            this.logger.warn(`Erro ao salvar conversa ${conversationData.id}: ${error.message}`);
          }
        }
      }

      // Salvar mensagens
      if (data.messages?.length) {
        this.logger.log(`Salvando ${data.messages.length} mensagens`);
        for (const messageData of data.messages) {
          try {
            // Encontrar conversa correspondente
            const conversation = await this.conversationRepository.findByWhatsAppId(messageData.from);
            if (conversation) {
              const message = await this.saveMessage(messageData, conversation.id);
              results.messages.push(message);
            } else {
              this.logger.warn(`Conversa não encontrada para mensagem ${messageData.id}`);
            }
          } catch (error) {
            this.logger.warn(`Erro ao salvar mensagem ${messageData.id}: ${error.message}`);
          }
        }
      }

      this.logger.log(`Dados salvos: ${results.contacts.length} contatos, ${results.conversations.length} conversas, ${results.messages.length} mensagens`);
      return results;
    } catch (error) {
      this.logger.error(`Erro ao salvar dados do WhatsApp: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ===== TRANSCRIÇÃO DE ÁUDIOS =====

  async processAudioTranscriptions(): Promise<void> {
    try {
      const messages = await this.messageRepository.findMessagesNeedingTranscription();
      this.logger.log(`Encontradas ${messages.length} mensagens de áudio para transcrever`);

      for (const message of messages) {
        try {
          // Aqui você integraria com o serviço de transcrição (Whisper API)
          // Por enquanto, vamos simular
          this.logger.log(`Processando transcrição para mensagem ${message.id}`);
          
          // TODO: Implementar integração com Whisper API
          // const transcription = await this.transcriptionService.transcribe(message.mediaUrl);
          // await this.messageRepository.setTranscription(message.id, transcription.text, transcription.confidence);
          
        } catch (error) {
          this.logger.warn(`Erro ao transcrever mensagem ${message.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao processar transcrições: ${error.message}`, error.stack);
    }
  }

  // ===== ESTATÍSTICAS =====

  async getStats(): Promise<{
    contacts: any;
    conversations: any;
    messages: any;
  }> {
    const [contactStats, conversationStats, messageStats] = await Promise.all([
      this.contactRepository.getStats(),
      this.conversationRepository.getStats(),
      this.messageRepository.getStats(),
    ]);

    return {
      contacts: contactStats,
      conversations: conversationStats,
      messages: messageStats,
    };
  }

  // ===== MÉTODOS AUXILIARES =====

  private determineMessageType(messageData: any): MessageType {
    if (messageData.type) {
      // Mapear tipos do WhatsApp para nossos tipos
      switch (messageData.type.toLowerCase()) {
        case 'chat':
        case 'text': return MessageType.TEXT;
        case 'image': return MessageType.IMAGE;
        case 'audio': return MessageType.AUDIO;
        case 'ptt': return MessageType.PTT;
        case 'voice': return MessageType.VOICE;
        case 'video': return MessageType.VIDEO;
        case 'document': return MessageType.DOCUMENT;
        case 'sticker': return MessageType.STICKER;
        case 'location': return MessageType.LOCATION;
        case 'vcard': return MessageType.CONTACT;
        case 'poll': return MessageType.POLL;
        case 'system': return MessageType.SYSTEM;
        case 'revoked': return MessageType.REVOKED;
        default: return MessageType.TEXT;
      }
    }

    // Detectar tipo baseado no conteúdo
    if (messageData.location) return MessageType.LOCATION;
    if (messageData.vCards?.length) return MessageType.CONTACT;
    if (messageData.mediaUrl || messageData.url) {
      if (messageData.mimetype?.startsWith('image/')) return MessageType.IMAGE;
      if (messageData.mimetype?.startsWith('video/')) return MessageType.VIDEO;
      if (messageData.mimetype?.startsWith('audio/')) return MessageType.AUDIO;
      return MessageType.DOCUMENT;
    }

    return MessageType.TEXT;
  }

  private extractLinks(text: string): Array<{ url: string; title?: string }> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    
    if (!matches) return [];
    
    return matches.map(url => ({ url }));
  }

  // ===== BUSCA AVANÇADA =====

  async advancedSearch(query: {
    text?: string;
    contactName?: string;
    conversationId?: string;
    messageType?: MessageType;
    dateFrom?: Date;
    dateTo?: Date;
    hasMedia?: boolean;
    hasTranscription?: boolean;
    isStarred?: boolean;
    sentiment?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{
    messages: Message[];
    total: number;
    conversations: Conversation[];
    contacts: Contact[];
  }> {
    // Buscar mensagens
    const messageResults = await this.messageRepository.search({
      text: query.text,
      conversationId: query.conversationId,
      type: query.messageType,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      hasTranscription: query.hasTranscription,
      isStarred: query.isStarred,
      sentiment: query.sentiment,
      tags: query.tags,
      limit: query.limit,
      offset: query.offset,
    });

    // Buscar conversas relacionadas
    const conversationResults = await this.conversationRepository.search({
      contactName: query.contactName,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      tags: query.tags,
      limit: 20,
    });

    // Buscar contatos relacionados
    const contacts = query.contactName 
      ? await this.contactRepository.findByName(query.contactName)
      : [];

    return {
      messages: messageResults.messages,
      total: messageResults.total,
      conversations: conversationResults.conversations,
      contacts,
    };
  }
}

