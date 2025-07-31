import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsPhoneNumber } from 'class-validator';

export class CreateContactDto {
  @IsString()
  whatsappId: string;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  pushName?: string;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @IsOptional()
  @IsBoolean()
  isBusiness?: boolean;

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @IsOptional()
  @IsArray()
  groupParticipants?: {
    id: string;
    name: string;
    isAdmin: boolean;
  }[];

  @IsOptional()
  @IsString()
  statusMessage?: string;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsArray()
  labels?: string[];

  @IsOptional()
  @IsObject()
  metadata?: {
    businessCategory?: string;
    businessDescription?: string;
    businessHours?: string;
    customFields?: Record<string, any>;
  };
}

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  pushName?: string;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @IsOptional()
  @IsBoolean()
  isBusiness?: boolean;

  @IsOptional()
  @IsArray()
  groupParticipants?: {
    id: string;
    name: string;
    isAdmin: boolean;
  }[];

  @IsOptional()
  @IsString()
  statusMessage?: string;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsArray()
  labels?: string[];

  @IsOptional()
  @IsObject()
  metadata?: {
    businessCategory?: string;
    businessDescription?: string;
    businessHours?: string;
    customFields?: Record<string, any>;
  };
}

export class SearchContactsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @IsOptional()
  @IsBoolean()
  isBusiness?: boolean;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @IsArray()
  labels?: string[];

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  offset?: string;
}

