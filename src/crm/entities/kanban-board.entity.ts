import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { KanbanColumn } from './kanban-column.entity';

export enum BoardType {
  CONVERSATIONS = 'conversations',
  TASKS = 'tasks',
  LEADS = 'leads',
  SUPPORT = 'support',
  CUSTOM = 'custom'
}

export enum BoardStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

@Entity('kanban_boards')
@Index(['name'])
@Index(['type'])
@Index(['status'])
@Index(['ownerId'])
export class KanbanBoard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: BoardType,
    default: BoardType.CONVERSATIONS
  })
  type: BoardType;

  @Column({
    type: 'enum',
    enum: BoardStatus,
    default: BoardStatus.ACTIVE
  })
  status: BoardStatus;

  @Column()
  ownerId: string;

  // Configurações do board
  @Column({ type: 'json', nullable: true })
  settings: {
    allowPublicView?: boolean;
    autoAssignCards?: boolean;
    cardTemplate?: string;
    defaultPriority?: string;
    enableTimeTracking?: boolean;
    enableComments?: boolean;
    enableAttachments?: boolean;
    enableDueDates?: boolean;
    enableLabels?: boolean;
    maxCardsPerColumn?: number;
    swimlanes?: boolean;
  };

  // Permissões de acesso
  @Column({ type: 'json', nullable: true })
  permissions: {
    viewers?: string[]; // IDs dos usuários que podem visualizar
    editors?: string[]; // IDs dos usuários que podem editar
    admins?: string[]; // IDs dos usuários que podem administrar
    teams?: string[]; // IDs das equipes com acesso
    whatsappInstances?: string[]; // Instâncias vinculadas
  };

  // Configurações visuais
  @Column({ type: 'json', nullable: true })
  appearance: {
    backgroundColor?: string;
    backgroundImage?: string;
    cardStyle?: 'compact' | 'detailed' | 'minimal';
    showCardNumbers?: boolean;
    showAssignees?: boolean;
    showDueDates?: boolean;
    showPriority?: boolean;
    showLabels?: boolean;
    columnWidth?: number;
  };

  // Métricas do board
  @Column({ type: 'int', default: 0 })
  totalCards: number;

  @Column({ type: 'int', default: 0 })
  completedCards: number;

  @Column({ type: 'int', default: 0 })
  overdueCards: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageCompletionTime: number; // em horas

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  // Informações adicionais
  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => KanbanColumn, column => column.board, { cascade: true })
  columns: KanbanColumn[];

  // Métodos auxiliares
  isActive(): boolean {
    return this.status === BoardStatus.ACTIVE;
  }

  canUserView(userId: string): boolean {
    if (this.ownerId === userId) return true;
    if (this.permissions?.admins?.includes(userId)) return true;
    if (this.permissions?.editors?.includes(userId)) return true;
    if (this.permissions?.viewers?.includes(userId)) return true;
    return false;
  }

  canUserEdit(userId: string): boolean {
    if (this.ownerId === userId) return true;
    if (this.permissions?.admins?.includes(userId)) return true;
    if (this.permissions?.editors?.includes(userId)) return true;
    return false;
  }

  canUserAdmin(userId: string): boolean {
    if (this.ownerId === userId) return true;
    if (this.permissions?.admins?.includes(userId)) return true;
    return false;
  }

  hasInstanceAccess(instanceId: string): boolean {
    return this.permissions?.whatsappInstances?.includes(instanceId) || false;
  }

  updateMetrics(totalCards: number, completedCards: number, overdueCards: number, avgTime: number): void {
    this.totalCards = totalCards;
    this.completedCards = completedCards;
    this.overdueCards = overdueCards;
    this.averageCompletionTime = avgTime;
    this.lastActivityAt = new Date();
  }

  getCompletionRate(): number {
    if (this.totalCards === 0) return 0;
    return (this.completedCards / this.totalCards) * 100;
  }

  getOverdueRate(): number {
    if (this.totalCards === 0) return 0;
    return (this.overdueCards / this.totalCards) * 100;
  }

  addViewer(userId: string): void {
    if (!this.permissions) this.permissions = {};
    if (!this.permissions.viewers) this.permissions.viewers = [];
    if (!this.permissions.viewers.includes(userId)) {
      this.permissions.viewers.push(userId);
    }
  }

  removeViewer(userId: string): void {
    if (this.permissions?.viewers) {
      this.permissions.viewers = this.permissions.viewers.filter(id => id !== userId);
    }
  }

  addEditor(userId: string): void {
    if (!this.permissions) this.permissions = {};
    if (!this.permissions.editors) this.permissions.editors = [];
    if (!this.permissions.editors.includes(userId)) {
      this.permissions.editors.push(userId);
    }
  }

  removeEditor(userId: string): void {
    if (this.permissions?.editors) {
      this.permissions.editors = this.permissions.editors.filter(id => id !== userId);
    }
  }

  addAdmin(userId: string): void {
    if (!this.permissions) this.permissions = {};
    if (!this.permissions.admins) this.permissions.admins = [];
    if (!this.permissions.admins.includes(userId)) {
      this.permissions.admins.push(userId);
    }
  }

  removeAdmin(userId: string): void {
    if (this.permissions?.admins) {
      this.permissions.admins = this.permissions.admins.filter(id => id !== userId);
    }
  }

  addInstance(instanceId: string): void {
    if (!this.permissions) this.permissions = {};
    if (!this.permissions.whatsappInstances) this.permissions.whatsappInstances = [];
    if (!this.permissions.whatsappInstances.includes(instanceId)) {
      this.permissions.whatsappInstances.push(instanceId);
    }
  }

  removeInstance(instanceId: string): void {
    if (this.permissions?.whatsappInstances) {
      this.permissions.whatsappInstances = this.permissions.whatsappInstances.filter(id => id !== instanceId);
    }
  }
}

