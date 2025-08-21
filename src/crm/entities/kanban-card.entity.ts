import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { KanbanColumn } from './kanban-column.entity';
import { User } from './user.entity';
import { CardActivity } from './card-activity.entity';

export enum CardType {
  CONVERSATION = 'conversation',
  TASK = 'task',
  LEAD = 'lead',
  SUPPORT = 'support',
  BUG = 'bug',
  FEATURE = 'feature',
  CUSTOM = 'custom'
}

export enum CardStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
  ARCHIVED = 'archived'
}

export enum CardPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

@Entity('kanban_cards')
@Index(['columnId'])
@Index(['assigneeId'])
@Index(['status'])
@Index(['priority'])
@Index(['dueDate'])
@Index(['conversationId'])
@Index(['position'])
export class KanbanCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  columnId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CardType,
    default: CardType.TASK
  })
  type: CardType;

  @Column({
    type: 'enum',
    enum: CardStatus,
    default: CardStatus.ACTIVE
  })
  status: CardStatus;

  @Column({
    type: 'enum',
    enum: CardPriority,
    default: CardPriority.NORMAL
  })
  priority: CardPriority;

  @Column({ type: 'int' })
  position: number;

  @Column({ nullable: true })
  assigneeId: string;

  @Column({ nullable: true })
  reporterId: string;

  // Vinculação com conversa do WhatsApp
  @Column({ nullable: true })
  conversationId: string;

  @Column({ nullable: true })
  whatsappInstanceId: string;

  @Column({ nullable: true })
  contactName: string;

  @Column({ nullable: true })
  contactPhone: string;

  // Datas importantes
  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  movedToColumnAt: Date;

  // Estimativas e tempo
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  estimatedHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  actualHours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  timeInColumn: number; // tempo gasto na coluna atual em horas

  // Labels e categorização
  @Column({ type: 'json', nullable: true })
  labels: string[];

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  subcategory: string;

  // Configurações visuais
  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string;

  @Column({ nullable: true })
  coverImage: string;

  // Checklist e progresso
  @Column({ type: 'json', nullable: true })
  checklist: {
    id: string;
    text: string;
    completed: boolean;
    completedAt?: Date;
    completedBy?: string;
  }[];

  @Column({ type: 'int', default: 0 })
  checklistProgress: number; // porcentagem 0-100

  // Anexos e links
  @Column({ type: 'json', nullable: true })
  attachments: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: Date;
    uploadedBy: string;
  }[];

  @Column({ type: 'json', nullable: true })
  links: {
    id: string;
    title: string;
    url: string;
    description?: string;
    addedAt: Date;
    addedBy: string;
  }[];

  // Métricas e avaliação
  @Column({ type: 'int', nullable: true })
  customerRating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  customerFeedback: string;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  // Flags de estado
  @Column({ type: 'boolean', default: false })
  archived: boolean;

  @Column({ type: 'boolean', default: false })
  blocked: boolean;

  @Column({ type: 'text', nullable: true })
  blockedReason: string;

  @Column({ type: 'boolean', default: false })
  urgent: boolean;

  @Column({ type: 'boolean', default: false })
  starred: boolean;

  // Informações adicionais
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  customFields: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => KanbanColumn, column => column.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'columnId' })
  column: KanbanColumn;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigneeId' })
  assignee: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @OneToMany(() => CardActivity, activity => activity.card, { cascade: true })
  activities: CardActivity[];

  // Métodos auxiliares
  isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate && this.status !== CardStatus.COMPLETED;
  }

  isDueSoon(hoursThreshold: number = 24): boolean {
    if (!this.dueDate) return false;
    const now = new Date();
    const threshold = new Date(now.getTime() + hoursThreshold * 60 * 60 * 1000);
    return this.dueDate <= threshold && this.status !== CardStatus.COMPLETED;
  }

  isCompleted(): boolean {
    return this.status === CardStatus.COMPLETED;
  }

  isBlocked(): boolean {
    return this.blocked;
  }

  getProgressPercentage(): number {
    if (!this.checklist || this.checklist.length === 0) {
      return this.status === CardStatus.COMPLETED ? 100 : 0;
    }
    
    const completedItems = this.checklist.filter(item => item.completed).length;
    return Math.round((completedItems / this.checklist.length) * 100);
  }

  updateChecklistProgress(): void {
    this.checklistProgress = this.getProgressPercentage();
  }

  addChecklistItem(text: string, userId: string): void {
    if (!this.checklist) this.checklist = [];
    
    this.checklist.push({
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      completed: false
    });
    
    this.updateChecklistProgress();
  }

  completeChecklistItem(itemId: string, userId: string): void {
    if (!this.checklist) return;
    
    const item = this.checklist.find(item => item.id === itemId);
    if (item) {
      item.completed = true;
      item.completedAt = new Date();
      item.completedBy = userId;
      this.updateChecklistProgress();
    }
  }

  addAttachment(name: string, url: string, type: string, size: number, userId: string): void {
    if (!this.attachments) this.attachments = [];
    
    this.attachments.push({
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      url,
      type,
      size,
      uploadedAt: new Date(),
      uploadedBy: userId
    });
  }

  addLink(title: string, url: string, description: string, userId: string): void {
    if (!this.links) this.links = [];
    
    this.links.push({
      id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      url,
      description,
      addedAt: new Date(),
      addedBy: userId
    });
  }

  moveToColumn(newColumnId: string, newPosition: number): void {
    this.columnId = newColumnId;
    this.position = newPosition;
    this.movedToColumnAt = new Date();
    this.timeInColumn = 0; // Reset tempo na coluna
  }

  complete(userId: string, rating?: number, feedback?: string): void {
    this.status = CardStatus.COMPLETED;
    this.completedAt = new Date();
    
    if (rating) this.customerRating = rating;
    if (feedback) this.customerFeedback = feedback;
    
    // Marcar todos os itens do checklist como completos
    if (this.checklist) {
      this.checklist.forEach(item => {
        if (!item.completed) {
          item.completed = true;
          item.completedAt = new Date();
          item.completedBy = userId;
        }
      });
      this.updateChecklistProgress();
    }
  }

  archive(userId: string): void {
    this.archived = true;
    this.archivedAt = new Date();
    this.status = CardStatus.ARCHIVED;
  }

  block(reason: string, userId: string): void {
    this.blocked = true;
    this.blockedReason = reason;
  }

  unblock(userId: string): void {
    this.blocked = false;
    this.blockedReason = null;
  }

  star(userId: string): void {
    this.starred = true;
  }

  unstar(userId: string): void {
    this.starred = false;
  }

  addLabel(label: string): void {
    if (!this.labels) this.labels = [];
    if (!this.labels.includes(label)) {
      this.labels.push(label);
    }
  }

  removeLabel(label: string): void {
    if (this.labels) {
      this.labels = this.labels.filter(l => l !== label);
    }
  }

  updateTimeInColumn(): void {
    if (this.movedToColumnAt) {
      const now = new Date();
      const diffMs = now.getTime() - this.movedToColumnAt.getTime();
      this.timeInColumn = diffMs / (1000 * 60 * 60); // converter para horas
    }
  }

  calculateActualHours(): number {
    if (!this.activities) return 0;
    
    // Somar tempo de todas as atividades de trabalho
    return this.activities
      .filter(activity => activity.type === 'time_logged')
      .reduce((total, activity) => {
        return total + (activity.timeSpent || 0);
      }, 0);
  }

  getTimeRemaining(): number | null {
    if (!this.estimatedHours || !this.actualHours) return null;
    return Math.max(0, this.estimatedHours - this.actualHours);
  }

  isOverBudget(): boolean {
    if (!this.estimatedHours || !this.actualHours) return false;
    return this.actualHours > this.estimatedHours;
  }

  clone(newColumnId: string, newPosition: number): Partial<KanbanCard> {
    return {
      columnId: newColumnId,
      title: `${this.title} (Cópia)`,
      description: this.description,
      type: this.type,
      priority: this.priority,
      position: newPosition,
      labels: [...(this.labels || [])],
      category: this.category,
      subcategory: this.subcategory,
      estimatedHours: this.estimatedHours,
      notes: this.notes,
      customFields: { ...this.customFields },
      metadata: { ...this.metadata }
    };
  }
}

