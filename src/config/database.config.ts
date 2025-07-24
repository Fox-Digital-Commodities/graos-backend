import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Card } from '../cards/entities/card.entity';
import { Produto } from '../cards/entities/produto.entity';
import { Preco } from '../cards/entities/preco.entity';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'mysql',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 3306,
    username: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'graos_app',
    entities: [Card, Produto, Preco],
    synchronize: process.env.NODE_ENV !== 'production', // Apenas em desenvolvimento
    logging: process.env.NODE_ENV === 'development',
  }),
);

