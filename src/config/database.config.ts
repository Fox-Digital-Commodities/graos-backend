import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Card } from '../cards/entities/card.entity';
import { Produto } from '../cards/entities/produto.entity';
import { Preco } from '../cards/entities/preco.entity';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
<<<<<<< HEAD
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    username: process.env.DATABASE_USERNAME || 'root',
=======
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
>>>>>>> a531a25900eb57a0576a44cc76109bf4ac80a3d8
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'foxgraos',
    entities: [Card, Produto, Preco],
    synchronize: process.env.NODE_ENV !== 'production', // Apenas em desenvolvimento
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  }),
);

