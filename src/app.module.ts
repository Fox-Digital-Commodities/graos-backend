import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadModule } from './upload/upload.module';
import { ProcessingModule } from './processing/processing.module';
import { CardsModule } from './cards/cards.module';
import { SpreadsheetModule } from './spreadsheet/spreadsheet.module';
import databaseConfig from './config/database.config';
import openaiConfig from './config/openai.config';
import appConfig from './config/app.config';

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
      useFactory: (configService: ConfigService) =>
        configService.get('database'),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
