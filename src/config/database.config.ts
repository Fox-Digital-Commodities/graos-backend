import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Card } from '../cards/entities/card.entity';
import { Produto } from '../cards/entities/produto.entity';
import { Preco } from '../cards/entities/preco.entity';
import { ConversationThread } from '../chatgpt/entities/conversation-thread.entity';
import { Contact } from '../whatsapp/entities/contact.entity';
import { Conversation } from '../whatsapp/entities/conversation.entity';
import { Message } from '../whatsapp/entities/message.entity';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'foxgraos',
    entities: [Card, Produto, Preco, ConversationThread, Contact, Conversation, Message],
    synchronize: process.env.NODE_ENV !== 'production', // Apenas em desenvolvimento
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  }),
);

