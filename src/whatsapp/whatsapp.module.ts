import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entidades
import { Contact } from './entities/contact.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

// Repositórios
import { ContactRepository } from './repositories/contact.repository';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';

// Serviços
import { WhatsAppService } from './services/whatsapp.service';

// Controllers
import { WhatsAppController } from './controllers/whatsapp.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Contact,
      Conversation,
      Message,
    ]),
  ],
  controllers: [
    WhatsAppController,
  ],
  providers: [
    WhatsAppService,
    ContactRepository,
    ConversationRepository,
    MessageRepository,
  ],
  exports: [
    WhatsAppService,
    ContactRepository,
    ConversationRepository,
    MessageRepository,
  ],
})
export class WhatsAppModule {}

