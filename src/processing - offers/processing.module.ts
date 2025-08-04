import { Module } from '@nestjs/common';
import { ProcessingController } from './processing.controller';
import { ProcessingService } from './processing.service';
import { ChatGPTService } from './chatgpt.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [ProcessingController],
  providers: [ProcessingService, ChatGPTService],
  exports: [ProcessingService, ChatGPTService],
})
export class ProcessingModule {}
