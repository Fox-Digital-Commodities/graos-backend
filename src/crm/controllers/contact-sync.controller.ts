import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { ContactSyncService } from '../services/contact-sync.service';
import { SyncContactsDto, CreateBoardFromConversationsDto } from '../dto/sync-contacts.dto';

@Controller('api/crm/sync')
export class ContactSyncController {
  constructor(private readonly contactSyncService: ContactSyncService) {}

  @Post('contacts')
  async syncContacts(@Body() syncContactsDto: SyncContactsDto) {
    return await this.contactSyncService.syncContactsFromMaytapi(syncContactsDto);
  }

  @Post('boards/from-conversations')
  async createBoardFromConversations(@Body() createBoardDto: CreateBoardFromConversationsDto) {
    return await this.contactSyncService.createBoardFromConversations(createBoardDto);
  }

  @Post('boards/logistics/:instanceId')
  async createLogisticsBoard(@Param('instanceId') instanceId: string) {
    const createBoardDto: CreateBoardFromConversationsDto = {
      name: 'Logística',
      type: 'logistics',
      instanceId,
      description: 'Gestão de entregas e transporte de grãos',
      keywords: [
        'entrega', 'transporte', 'frete', 'logística', 'prazo',
        'envio', 'recebimento', 'carga', 'descarga', 'caminhão'
      ],
      excludeKeywords: [
        'preço', 'cotação', 'compra', 'venda', 'pagamento'
      ],
    };

    return await this.contactSyncService.createBoardFromConversations(createBoardDto);
  }

  @Post('boards/commercial/:instanceId')
  async createCommercialBoard(@Param('instanceId') instanceId: string) {
    const createBoardDto: CreateBoardFromConversationsDto = {
      name: 'Comercial',
      type: 'commercial',
      instanceId,
      description: 'Gestão de vendas e negociações de grãos',
      keywords: [
        'preço', 'cotação', 'compra', 'venda', 'proposta',
        'desconto', 'pagamento', 'pedido', 'negociação', 'contrato'
      ],
      excludeKeywords: [
        'entrega', 'transporte', 'frete', 'prazo de entrega'
      ],
    };

    return await this.contactSyncService.createBoardFromConversations(createBoardDto);
  }

  @Get('status/:instanceId')
  async getSyncStatus(@Param('instanceId') instanceId: string) {
    // TODO: Implementar status da sincronização
    return {
      instanceId,
      lastSync: new Date(),
      status: 'completed',
      contactsCount: 0,
      conversationsCount: 0,
      messagesCount: 0,
    };
  }
}

