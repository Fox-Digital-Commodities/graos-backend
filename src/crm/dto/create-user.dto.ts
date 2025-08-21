import { IsString, IsEmail, IsEnum, IsOptional, IsInt, IsBoolean, IsObject, MinLength, MaxLength, Min, Max, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus, UserAvailability } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ description: 'Nome de usuário único' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({ description: 'Email único do usuário' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Senha do usuário' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Nome completo do usuário' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ description: 'URL do avatar', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ description: 'Telefone do usuário', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ 
    description: 'Papel do usuário no sistema',
    enum: UserRole,
    default: UserRole.AGENT
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ 
    description: 'Status do usuário',
    enum: UserStatus,
    default: UserStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({ 
    description: 'Disponibilidade do usuário',
    enum: UserAvailability,
    default: UserAvailability.OFFLINE
  })
  @IsOptional()
  @IsEnum(UserAvailability)
  availability?: UserAvailability;

  @ApiProperty({ 
    description: 'Horário de trabalho do usuário',
    required: false,
    example: {
      monday: { start: '09:00', end: '18:00', active: true },
      tuesday: { start: '09:00', end: '18:00', active: true }
    }
  })
  @IsOptional()
  @IsObject()
  workSchedule?: {
    monday?: { start: string; end: string; active: boolean };
    tuesday?: { start: string; end: string; active: boolean };
    wednesday?: { start: string; end: string; active: boolean };
    thursday?: { start: string; end: string; active: boolean };
    friday?: { start: string; end: string; active: boolean };
    saturday?: { start: string; end: string; active: boolean };
    sunday?: { start: string; end: string; active: boolean };
  };

  @ApiProperty({ 
    description: 'Número máximo de chats simultâneos',
    default: 5,
    minimum: 1,
    maximum: 20
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxConcurrentChats?: number;

  @ApiProperty({ 
    description: 'Permissões específicas do usuário',
    required: false,
    example: {
      canViewAllChats: false,
      canAssignChats: false,
      canManageUsers: false,
      whatsappInstances: ['42102', '23183']
    }
  })
  @IsOptional()
  @IsObject()
  permissions?: {
    canViewAllChats?: boolean;
    canAssignChats?: boolean;
    canManageUsers?: boolean;
    canViewReports?: boolean;
    canExportData?: boolean;
    canManageSettings?: boolean;
    whatsappInstances?: string[];
  };

  @ApiProperty({ 
    description: 'Configurações de notificação',
    required: false,
    example: {
      emailNotifications: true,
      pushNotifications: true,
      soundNotifications: true
    }
  })
  @IsOptional()
  @IsObject()
  notificationSettings?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    soundNotifications?: boolean;
    newChatAlert?: boolean;
    mentionAlert?: boolean;
  };

  @ApiProperty({ description: 'Notas sobre o usuário', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ description: 'Metadados adicionais', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateUserDto {
  @ApiProperty({ description: 'Nome de usuário único', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username?: string;

  @ApiProperty({ description: 'Email único do usuário', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Nome completo do usuário', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiProperty({ description: 'URL do avatar', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ description: 'Telefone do usuário', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ 
    description: 'Papel do usuário no sistema',
    enum: UserRole,
    required: false
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ 
    description: 'Status do usuário',
    enum: UserStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({ 
    description: 'Disponibilidade do usuário',
    enum: UserAvailability,
    required: false
  })
  @IsOptional()
  @IsEnum(UserAvailability)
  availability?: UserAvailability;

  @ApiProperty({ description: 'Horário de trabalho do usuário', required: false })
  @IsOptional()
  @IsObject()
  workSchedule?: {
    monday?: { start: string; end: string; active: boolean };
    tuesday?: { start: string; end: string; active: boolean };
    wednesday?: { start: string; end: string; active: boolean };
    thursday?: { start: string; end: string; active: boolean };
    friday?: { start: string; end: string; active: boolean };
    saturday?: { start: string; end: string; active: boolean };
    sunday?: { start: string; end: string; active: boolean };
  };

  @ApiProperty({ 
    description: 'Número máximo de chats simultâneos',
    required: false,
    minimum: 1,
    maximum: 20
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxConcurrentChats?: number;

  @ApiProperty({ description: 'Permissões específicas do usuário', required: false })
  @IsOptional()
  @IsObject()
  permissions?: {
    canViewAllChats?: boolean;
    canAssignChats?: boolean;
    canManageUsers?: boolean;
    canViewReports?: boolean;
    canExportData?: boolean;
    canManageSettings?: boolean;
    whatsappInstances?: string[];
  };

  @ApiProperty({ description: 'Configurações de notificação', required: false })
  @IsOptional()
  @IsObject()
  notificationSettings?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    soundNotifications?: boolean;
    newChatAlert?: boolean;
    mentionAlert?: boolean;
  };

  @ApiProperty({ description: 'Notas sobre o usuário', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ description: 'Metadados adicionais', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Senha atual' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'Nova senha' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class UpdateAvailabilityDto {
  @ApiProperty({ 
    description: 'Nova disponibilidade do usuário',
    enum: UserAvailability
  })
  @IsEnum(UserAvailability)
  availability: UserAvailability;
}

export class AssignInstancesDto {
  @ApiProperty({ 
    description: 'IDs das instâncias do WhatsApp',
    type: [String],
    example: ['42102', '23183']
  })
  @IsArray()
  @IsString({ each: true })
  whatsappInstances: string[];
}

