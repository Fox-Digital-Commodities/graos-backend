import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { WhatsAppService } from '../services/whatsapp.service';
import { ContactRepository } from '../repositories/contact.repository';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';
import {
  CreateContactDto,
  UpdateContactDto,
  SearchContactsDto,
} from '../dto/create-contact.dto';
import {
  CreateConversationDto,
  UpdateConversationDto,
  SearchConversationsDto,
  SetConversationPriorityDto,
  SetConversationStatusDto,
  AddLabelDto,
  AddTagDto,
} from '../dto/create-conversation.dto';
import {
  CreateMessageDto,
  UpdateMessageDto,
  SearchMessagesDto,
  AddReactionDto,
  SetTranscriptionDto,
  SetSentimentDto,
  SetUrgencyDto,
  BulkSaveDto,
} from '../dto/create-message.dto';

@Controller('api/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly contactRepository: ContactRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
  ) {}

  // ===== ENDPOINTS DE CONTATOS =====

  @Post('contacts')
  async createContact(@Body() createContactDto: CreateContactDto) {
    try {
      const contact = await this.whatsappService.saveContact(createContactDto);
      return {
        success: true,
        data: contact,
        message: 'Contato criado com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao criar contato: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao criar contato: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('contacts')
  async getAllContacts(@Query() searchDto: SearchContactsDto) {
    try {
      if (Object.keys(searchDto).length > 0) {
        // Busca com filtros
        const query = {
          search: searchDto.search,
          whatsappId: searchDto.whatsappId,
          name: searchDto.name,
          phoneNumber: searchDto.phoneNumber,
          isGroup: searchDto.isGroup,
          isBusiness: searchDto.isBusiness,
          isFavorite: searchDto.isFavorite,
          isBlocked: searchDto.isBlocked,
          labels: searchDto.labels,
          limit: searchDto.limit ? parseInt(searchDto.limit) : undefined,
          offset: searchDto.offset ? parseInt(searchDto.offset) : undefined,
        };

        const result = await this.contactRepository.search(query);
        return {
          success: true,
          data: { contacts: result.contacts },
          total: result.total,
          message: 'Contatos encontrados',
        };
      } else {
        // Buscar todos os contatos ativos
        const contacts = await this.whatsappService.getAllContacts();
        return {
          success: true,
          data: { contacts },
          total: contacts.length,
          message: 'Contatos recuperados com sucesso',
        };
      }
    } catch (error) {
      this.logger.error(`Erro ao buscar contatos: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao buscar contatos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('contacts/:id')
  async getContact(@Param('id') id: string) {
    try {
      const contact = await this.contactRepository.findById(id);
      if (!contact) {
        throw new HttpException('Contato não encontrado', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: contact,
        message: 'Contato encontrado',
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar contato: ${error.message}`, error.stack);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('contacts/:id')
  async updateContact(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    try {
      const contact = await this.contactRepository.update(id, updateContactDto);
      return {
        success: true,
        data: contact,
        message: 'Contato atualizado com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao atualizar contato: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao atualizar contato: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('contacts/:id')
  async deleteContact(@Param('id') id: string) {
    try {
      await this.contactRepository.softDelete(id);
      return {
        success: true,
        message: 'Contato deletado com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao deletar contato: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao deletar contato: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('contacts/:id/toggle-favorite')
  async toggleFavorite(@Param('id') id: string) {
    try {
      const contact = await this.contactRepository.toggleFavorite(id);
      return {
        success: true,
        data: contact,
        message: `Contato ${contact.isFavorite ? 'adicionado aos' : 'removido dos'} favoritos`,
      };
    } catch (error) {
      this.logger.error(`Erro ao alterar favorito: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao alterar favorito: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('contacts/:id/toggle-block')
  async toggleBlock(@Param('id') id: string) {
    try {
      const contact = await this.contactRepository.toggleBlock(id);
      return {
        success: true,
        data: contact,
        message: `Contato ${contact.isBlocked ? 'bloqueado' : 'desbloqueado'}`,
      };
    } catch (error) {
      this.logger.error(`Erro ao alterar bloqueio: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao alterar bloqueio: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('contacts/:id/labels')
  async addContactLabel(@Param('id') id: string, @Body() addLabelDto: AddLabelDto) {
    try {
      const contact = await this.contactRepository.addLabel(id, addLabelDto.label);
      return {
        success: true,
        data: contact,
        message: 'Etiqueta adicionada com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao adicionar etiqueta: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao adicionar etiqueta: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('contacts/:id/labels/:label')
  async removeContactLabel(@Param('id') id: string, @Param('label') label: string) {
    try {
      const contact = await this.contactRepository.removeLabel(id, label);
      return {
        success: true,
        data: contact,
        message: 'Etiqueta removida com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao remover etiqueta: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao remover etiqueta: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('contacts/stats')
  async getContactStats() {
    try {
      const stats = await this.contactRepository.getStats();
      return {
        success: true,
        data: stats,
        message: 'Estatísticas de contatos',
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar estatísticas: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao buscar estatísticas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== ENDPOINTS DE CONVERSAS =====

  @Post('conversations')
  async createConversation(@Body() createConversationDto: CreateConversationDto) {
    try {
      const conversation = await this.whatsappService.saveConversation(
        createConversationDto,
        createConversationDto.contactId,
      );
      return {
        success: true,
        data: conversation,
        message: 'Conversa criada com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao criar conversa: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao criar conversa: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('conversations')
  async getAllConversations(@Query() searchDto: SearchConversationsDto) {
    try {
      if (Object.keys(searchDto).length > 0) {
        // Busca com filtros
        const query = {
          contactName: searchDto.contactName,
          title: searchDto.title,
          isGroup: searchDto.isGroup,
          isPinned: searchDto.isPinned,
          isArchived: searchDto.isArchived,
          unreadOnly: searchDto.unreadOnly,
          status: searchDto.status,
          priority: searchDto.priority,
          labels: searchDto.labels,
          tags: searchDto.tags,
          dateFrom: searchDto.dateFrom ? new Date(searchDto.dateFrom) : undefined,
          dateTo: searchDto.dateTo ? new Date(searchDto.dateTo) : undefined,
          limit: searchDto.limit ? parseInt(searchDto.limit) : undefined,
          offset: searchDto.offset ? parseInt(searchDto.offset) : undefined,
        };

        const result = await this.conversationRepository.search(query);
        return {
          success: true,
          data: result.conversations,
          total: result.total,
          message: 'Conversas encontradas',
        };
      } else {
        // Buscar todas as conversas ativas
        const conversations = await this.whatsappService.getAllConversations();
        return {
          success: true,
          data: conversations,
          total: conversations.length,
          message: 'Conversas recuperadas com sucesso',
        };
      }
    } catch (error) {
      this.logger.error(`Erro ao buscar conversas: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao buscar conversas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversations/recent')
  async getRecentConversations() {
    try {
      const conversations = await this.whatsappService.getRecentConversations();
      return {
        success: true,
        data: conversations,
        message: 'Conversas recentes recuperadas',
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar conversas recentes: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao buscar conversas recentes: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversations/unread')
  async getUnreadConversations() {
    try {
      const conversations = await this.whatsappService.getUnreadConversations();
      return {
        success: true,
        data: conversations,
        message: 'Conversas não lidas recuperadas',
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar conversas não lidas: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao buscar conversas não lidas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversations/:id')
  async getConversation(@Param('id') id: string) {
    try {
      const conversation = await this.conversationRepository.findById(id);
      if (!conversation) {
        throw new HttpException('Conversa não encontrada', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: conversation,
        message: 'Conversa encontrada',
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar conversa: ${error.message}`, error.stack);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('conversations/:id')
  async updateConversation(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
  ) {
    try {
      const conversation = await this.conversationRepository.update(id, updateConversationDto);
      return {
        success: true,
        data: conversation,
        message: 'Conversa atualizada com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao atualizar conversa: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao atualizar conversa: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('conversations/:id/mark-read')
  async markConversationAsRead(@Param('id') id: string) {
    try {
      const conversation = await this.conversationRepository.markAsRead(id);
      return {
        success: true,
        data: conversation,
        message: 'Conversa marcada como lida',
      };
    } catch (error) {
      this.logger.error(`Erro ao marcar como lida: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao marcar como lida: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('conversations/:id/toggle-pin')
  async toggleConversationPin(@Param('id') id: string) {
    try {
      const conversation = await this.conversationRepository.togglePin(id);
      return {
        success: true,
        data: conversation,
        message: `Conversa ${conversation.isPinned ? 'fixada' : 'desfixada'}`,
      };
    } catch (error) {
      this.logger.error(`Erro ao alterar fixação: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao alterar fixação: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('conversations/:id/toggle-archive')
  async toggleConversationArchive(@Param('id') id: string) {
    try {
      const conversation = await this.conversationRepository.toggleArchive(id);
      return {
        success: true,
        data: conversation,
        message: `Conversa ${conversation.isArchived ? 'arquivada' : 'desarquivada'}`,
      };
    } catch (error) {
      this.logger.error(`Erro ao alterar arquivamento: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao alterar arquivamento: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('conversations/:id/priority')
  async setConversationPriority(
    @Param('id') id: string,
    @Body() setPriorityDto: SetConversationPriorityDto,
  ) {
    try {
      const conversation = await this.conversationRepository.setPriority(id, setPriorityDto.priority);
      return {
        success: true,
        data: conversation,
        message: 'Prioridade definida com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao definir prioridade: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao definir prioridade: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('conversations/:id/status')
  async setConversationStatus(
    @Param('id') id: string,
    @Body() setStatusDto: SetConversationStatusDto,
  ) {
    try {
      const conversation = await this.conversationRepository.setStatus(id, setStatusDto.status);
      return {
        success: true,
        data: conversation,
        message: 'Status definido com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao definir status: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao definir status: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('conversations/stats')
  async getConversationStats() {
    try {
      const stats = await this.conversationRepository.getStats();
      return {
        success: true,
        data: stats,
        message: 'Estatísticas de conversas',
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar estatísticas: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao buscar estatísticas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== ENDPOINTS DE MENSAGENS =====

  @Post('messages')
  async createMessage(@Body() createMessageDto: CreateMessageDto) {
    try {
      const message = await this.whatsappService.saveMessage(
        createMessageDto,
        createMessageDto.conversationId,
      );
      return {
        success: true,
        data: message,
        message: 'Mensagem criada com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao criar mensagem: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao criar mensagem: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('messages')
  async searchMessages(@Query() searchDto: SearchMessagesDto) {
    try {
      const query = {
        text: searchDto.text,
        conversationId: searchDto.conversationId,
        type: searchDto.type,
        fromMe: searchDto.fromMe,
        author: searchDto.author,
        isStarred: searchDto.isStarred,
        isForwarded: searchDto.isForwarded,
        hasTranscription: searchDto.hasTranscription,
        sentiment: searchDto.sentiment,
        urgency: searchDto.urgency,
        tags: searchDto.tags,
        dateFrom: searchDto.dateFrom ? new Date(searchDto.dateFrom) : undefined,
        dateTo: searchDto.dateTo ? new Date(searchDto.dateTo) : undefined,
        limit: searchDto.limit ? parseInt(searchDto.limit) : undefined,
        offset: searchDto.offset ? parseInt(searchDto.offset) : undefined,
      };

      const result = await this.messageRepository.search(query);
      return {
        success: true,
        data: result.messages,
        total: result.total,
        message: 'Mensagens encontradas',
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar mensagens: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao buscar mensagens: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversations/:conversationId/messages')
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const messages = await this.whatsappService.getConversationMessages(
        conversationId,
        limit ? parseInt(limit) : 50,
        offset ? parseInt(offset) : 0,
      );
      return {
        success: true,
        data: messages,
        message: 'Mensagens da conversa recuperadas',
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar mensagens da conversa: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao buscar mensagens da conversa: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('messages/:id')
  async getMessage(@Param('id') id: string) {
    try {
      const message = await this.messageRepository.findById(id);
      if (!message) {
        throw new HttpException('Mensagem não encontrada', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: message,
        message: 'Mensagem encontrada',
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar mensagem: ${error.message}`, error.stack);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('messages/:id')
  async updateMessage(
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    try {
      const message = await this.messageRepository.update(id, updateMessageDto);
      return {
        success: true,
        data: message,
        message: 'Mensagem atualizada com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao atualizar mensagem: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao atualizar mensagem: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('messages/:id/toggle-star')
  async toggleMessageStar(@Param('id') id: string) {
    try {
      const message = await this.messageRepository.toggleStar(id);
      return {
        success: true,
        data: message,
        message: `Mensagem ${message.isStarred ? 'marcada' : 'desmarcada'} com estrela`,
      };
    } catch (error) {
      this.logger.error(`Erro ao alterar estrela: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao alterar estrela: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('messages/:id/reactions')
  async addMessageReaction(
    @Param('id') id: string,
    @Body() addReactionDto: AddReactionDto,
  ) {
    try {
      const message = await this.messageRepository.addReaction(
        id,
        addReactionDto.emoji,
        addReactionDto.author,
      );
      return {
        success: true,
        data: message,
        message: 'Reação adicionada com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao adicionar reação: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao adicionar reação: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('messages/:id/reactions/:author')
  async removeMessageReaction(
    @Param('id') id: string,
    @Param('author') author: string,
  ) {
    try {
      const message = await this.messageRepository.removeReaction(id, author);
      return {
        success: true,
        data: message,
        message: 'Reação removida com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao remover reação: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao remover reação: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('messages/:id/transcription')
  async setMessageTranscription(
    @Param('id') id: string,
    @Body() setTranscriptionDto: SetTranscriptionDto,
  ) {
    try {
      const message = await this.messageRepository.setTranscription(
        id,
        setTranscriptionDto.transcription,
        setTranscriptionDto.confidence,
        setTranscriptionDto.language,
      );
      return {
        success: true,
        data: message,
        message: 'Transcrição definida com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao definir transcrição: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao definir transcrição: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('messages/stats')
  async getMessageStats(@Query('conversationId') conversationId?: string) {
    try {
      const stats = await this.messageRepository.getStats(conversationId);
      return {
        success: true,
        data: stats,
        message: 'Estatísticas de mensagens',
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar estatísticas: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao buscar estatísticas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== ENDPOINTS ESPECIAIS =====

  @Post('bulk-save')
  async bulkSave(@Body() bulkSaveDto: BulkSaveDto) {
    try {
      const result = await this.whatsappService.saveWhatsAppData(bulkSaveDto);
      return {
        success: true,
        data: result,
        message: 'Dados salvos em lote com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao salvar dados em lote: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao salvar dados em lote: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('search')
  async advancedSearch(@Query() query: any) {
    try {
      const searchQuery = {
        text: query.text,
        contactName: query.contactName,
        conversationId: query.conversationId,
        messageType: query.messageType,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        hasMedia: query.hasMedia === 'true',
        hasTranscription: query.hasTranscription === 'true',
        isStarred: query.isStarred === 'true',
        sentiment: query.sentiment,
        tags: query.tags ? query.tags.split(',') : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      };

      const result = await this.whatsappService.advancedSearch(searchQuery);
      return {
        success: true,
        data: result,
        message: 'Busca avançada realizada',
      };
    } catch (error) {
      this.logger.error(`Erro na busca avançada: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro na busca avançada: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getGeneralStats() {
    try {
      const stats = await this.whatsappService.getStats();
      return {
        success: true,
        data: stats,
        message: 'Estatísticas gerais',
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar estatísticas gerais: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao buscar estatísticas gerais: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('process-transcriptions')
  async processTranscriptions() {
    try {
      await this.whatsappService.processAudioTranscriptions();
      return {
        success: true,
        message: 'Processamento de transcrições iniciado',
      };
    } catch (error) {
      this.logger.error(`Erro ao processar transcrições: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao processar transcrições: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

