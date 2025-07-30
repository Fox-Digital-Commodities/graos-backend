import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join, extname } from 'path';
import { diskStorage } from 'multer';

// Configurações
import databaseConfig from './config/database.config';
import openaiConfig from './config/openai.config';
import appConfig from './config/app.config';

// Módulos
import { UploadModule } from './upload/upload.module';
import { ProcessingModule } from './processing/processing.module';
import { CardsModule } from './cards/cards.module';
import { SpreadsheetModule } from './spreadsheet/spreadsheet.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, openaiConfig, appConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Configuração do banco de dados
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions =>
        configService.get<TypeOrmModuleOptions>('database')!,
    }),

    // Configuração do Multer para upload de arquivos
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        storage: diskStorage({
          destination: configService.get('app.uploadPath'),
          filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
          },
        }),
        limits: {
          fileSize: configService.get('app.maxFileSize'),
        },
        fileFilter: (req, file, callback) => {
          const allowedTypes = configService.get('app.allowedFileTypes');
          if (allowedTypes.includes(file.mimetype)) {
            callback(null, true);
          } else {
            callback(new Error('Tipo de arquivo não permitido'), false);
          }
        },
      }),
    }),

    // Módulos da aplicação
    UploadModule,
    ProcessingModule,
    CardsModule,
    SpreadsheetModule,
    MediaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
