import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProcessingModule } from './processing - offers/processing.module';
import { UploadModule } from './upload/upload.module';
import { MediaModule } from './media/media.module';
import { ChatGPTModule } from './chatgpt - CRM/chatgpt.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    TypeOrmModule.forRoot(databaseConfig()),
    ProcessingModule,
    UploadModule,
    MediaModule,
    ChatGPTModule,
    TranscriptionModule,
    WhatsAppModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

