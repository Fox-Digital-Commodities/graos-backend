import { IsString, IsOptional, IsArray, IsBoolean, IsNumber } from 'class-validator';

export class SyncContactsDto {
  @IsString()
  instanceId: string;

  @IsOptional()
  @IsBoolean()
  forceSync?: boolean = false;

  @IsOptional()
  @IsNumber()
  limit?: number = 100;
}

export class CreateBoardFromConversationsDto {
  @IsString()
  name: string;

  @IsString()
  type: string; // 'logistics' | 'commercial' | 'support'

  @IsString()
  instanceId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[]; // Palavras-chave para filtrar conversas

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeKeywords?: string[]; // Palavras-chave para excluir conversas
}

export class ImportContactDto {
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  lastSeen?: string;

  @IsString()
  instanceId: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsNumber()
  messageCount?: number;

  @IsOptional()
  @IsString()
  lastMessageAt?: string;

  @IsOptional()
  @IsString()
  lastMessageText?: string;

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean = false;
}

