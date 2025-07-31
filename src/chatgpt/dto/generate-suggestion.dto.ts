import { IsString, IsArray, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MessageDto {
  @ApiProperty({ description: 'Texto da mensagem' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Tipo da mensagem', enum: ['text', 'audio', 'image', 'document', 'ptt', 'voice', 'audio_transcribed'] })
  @IsEnum(['text', 'audio', 'image', 'document', 'ptt', 'voice', 'audio_transcribed'])
  type: string;

  @ApiProperty({ description: 'Se a mensagem é do usuário atual', default: false })
  @IsOptional()
  fromMe?: boolean;

  @ApiProperty({ description: 'Role da mensagem no contexto ChatGPT', enum: ['user', 'assistant'] })
  @IsOptional()
  @IsEnum(['user', 'assistant'])
  role?: string;

  @ApiProperty({ description: 'Timestamp da mensagem' })
  @IsOptional()
  timestamp?: number;

  @ApiProperty({ description: 'URL de mídia (se aplicável)' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiProperty({ description: 'Duração do áudio em segundos (para mensagens de áudio)' })
  @IsOptional()
  duration?: number;

  @ApiProperty({ description: 'ID único da mensagem' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Informações de transcrição (quando aplicável)' })
  @IsOptional()
  transcription?: {
    original: string;
    confidence: number;
    language: string;
    duration: number;
  };
}

export class GenerateSuggestionDto {
  @ApiProperty({ 
    description: 'Histórico de mensagens da conversa (últimas 10-20 mensagens)',
    type: [MessageDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @ApiProperty({ 
    description: 'ID único da conversa/chat para vincular thread',
    example: 'chat_12345@c.us'
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ 
    description: 'Contexto adicional sobre o negócio/empresa',
    example: 'Empresa de logística e transporte de grãos',
    required: false
  })
  @IsOptional()
  @IsString()
  businessContext?: string;

  @ApiProperty({ 
    description: 'Tom desejado para as respostas',
    enum: ['formal', 'informal', 'profissional', 'amigável'],
    default: 'profissional'
  })
  @IsOptional()
  @IsEnum(['formal', 'informal', 'profissional', 'amigável'])
  tone?: string;

  @ApiProperty({ 
    description: 'Número de sugestões a gerar',
    minimum: 1,
    maximum: 5,
    default: 3
  })
  @IsOptional()
  suggestionCount?: number;

  @ApiProperty({ 
    description: 'Informações do contato/cliente',
    required: false
  })
  @IsOptional()
  contactInfo?: {
    name?: string;
    company?: string;
    relationship?: string; // cliente, fornecedor, motorista, etc.
  };
}

