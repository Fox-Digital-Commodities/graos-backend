import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { ConversationAssignment } from './conversation-assignment.entity';

export enum UserRole {
  ADMIN = 'admin',
  SUPERVISOR = 'supervisor',
  AGENT = 'agent',
  VIEWER = 'viewer'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export enum UserAvailability {
  AVAILABLE = 'available',
  BUSY = 'busy',
  AWAY = 'away',
  OFFLINE = 'offline'
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
@Index(['role'])
@Index(['status'])
@Index(['availability'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // Hash da senha

  @Column()
  fullName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.AGENT
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE
  })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: UserAvailability,
    default: UserAvailability.OFFLINE
  })
  availability: UserAvailability;

  // Configurações de trabalho
  @Column({ type: 'json', nullable: true })
  workSchedule: {
    monday?: { start: string; end: string; active: boolean };
    tuesday?: { start: string; end: string; active: boolean };
    wednesday?: { start: string; end: string; active: boolean };
    thursday?: { start: string; end: string; active: boolean };
    friday?: { start: string; end: string; active: boolean };
    saturday?: { start: string; end: string; active: boolean };
    sunday?: { start: string; end: string; active: boolean };
  };

  // Configurações de capacidade
  @Column({ type: 'int', default: 5 })
  maxConcurrentChats: number;

  @Column({ type: 'int', default: 0 })
  currentChatCount: number;

  // Permissões específicas
  @Column({ type: 'json', nullable: true })
  permissions: {
    canViewAllChats?: boolean;
    canAssignChats?: boolean;
    canManageUsers?: boolean;
    canViewReports?: boolean;
    canExportData?: boolean;
    canManageSettings?: boolean;
    whatsappInstances?: string[]; // IDs das instâncias que pode acessar
  };

  // Configurações de notificação
  @Column({ type: 'json', nullable: true })
  notificationSettings: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    soundNotifications?: boolean;
    newChatAlert?: boolean;
    mentionAlert?: boolean;
  };

  // Métricas básicas
  @Column({ type: 'int', default: 0 })
  totalChatsHandled: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageResponseTime: number; // em minutos

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  customerSatisfactionScore: number; // 0-5

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  // Informações adicionais
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @OneToMany(() => ConversationAssignment, assignment => assignment.user)
  conversationAssignments: ConversationAssignment[];

  // Métodos auxiliares
  isAvailable(): boolean {
    return this.status === UserStatus.ACTIVE && 
           this.availability === UserAvailability.AVAILABLE &&
           this.currentChatCount < this.maxConcurrentChats;
  }

  canHandleMoreChats(): boolean {
    return this.currentChatCount < this.maxConcurrentChats;
  }

  hasPermission(permission: string): boolean {
    if (this.role === UserRole.ADMIN) return true;
    return this.permissions?.[permission] || false;
  }

  canAccessInstance(instanceId: string): boolean {
    if (this.role === UserRole.ADMIN) return true;
    return this.permissions?.whatsappInstances?.includes(instanceId) || false;
  }
}

