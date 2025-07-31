import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Contact } from './contact.entity';
import { Message } from './message.entity';

@Entity('conversations')
@Index(['whatsappId'], { unique: true }) // Índice único para WhatsApp conversation ID
@Index(['contactId']) // Índice para busca por contato
@Index(['lastMessageAt']) // Índice para ordenação por última mensagem
export class Conversation {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ name: 'whatsapp_id', unique: true, nullable: false })
  whatsappId: string; // ID único da conversa no WhatsApp (ex: 5511999887766@c.us)

  @Column({ name: 'contact_id', nullable: false })
  contactId: string; // ID do contato

  @Column({ name: 'title', nullable: true })
  title: string; // Título da conversa (para grupos)

  @Column({ name: 'description', nullable: true })
  description: string; // Descrição da conversa (para grupos)

  @Column({ name: 'is_group', default: false })
  isGroup: boolean; // Se é uma conversa de grupo

  @Column({ name: 'is_muted', default: false })
  isMuted: boolean; // Se está silenciada

  @Column({ name: 'is_pinned', default: false })
  isPinned: boolean; // Se está fixada

  @Column({ name: 'is_archived', default: false })
  isArchived: boolean; // Se está arquivada

  @Column({ name: 'unread_count', default: 0 })
  unreadCount: number; // Número de mensagens não lidas

  @Column({ name: 'last_message_id', nullable: true })
  lastMessageId: string; // ID da última mensagem

  @Column({ name: 'last_message_text', nullable: true })
  lastMessageText: string; // Texto da última mensagem

  @Column({ name: 'last_message_type', nullable: true })
  lastMessageType: string; // Tipo da última mensagem

  @Column({ name: 'last_message_at', type: 'timestamp', nullable: true })
  lastMessageAt: Date; // Timestamp da última mensagem

  @Column({ name: 'last_message_from_me', default: false })
  lastMessageFromMe: boolean; // Se a última mensagem foi enviada por nós

  @Column({ name: 'participant_count', default: 0 })
  participantCount: number; // Número de participantes (para grupos)

  @Column({ name: 'labels', type: 'json', nullable: true })
  labels: string[]; // Etiquetas/labels da conversa

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: {
    businessContext?: string;
    customerSegment?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    notes?: string;
    assignedTo?: string;
    status?: 'open' | 'pending' | 'resolved' | 'closed';
    customFields?: Record<string, any>;
  }; // Metadados da conversa

  @Column({ name: 'is_active', default: true })
  isActive: boolean; // Se a conversa está ativa

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => Contact, contact => contact.conversations)
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];

  // Métodos auxiliares
  getDisplayTitle(): string {
    if (this.title) return this.title;
    if (this.contact) return this.contact.getDisplayNameOrPhone();
    return this.whatsappId;
  }

  isRecentlyActive(): boolean {
    if (!this.lastMessageAt) return false;
    const now = new Date();
    const diffHours = (now.getTime() - this.lastMessageAt.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24; // Considera ativa se teve mensagem nas últimas 24h
  }

  updateLastMessage(message: Message) {
    this.lastMessageId = message.id;
    this.lastMessageText = message.getDisplayText();
    this.lastMessageType = message.type;
    this.lastMessageAt = message.timestamp;
    this.lastMessageFromMe = message.fromMe;
    this.updatedAt = new Date();
  }

  incrementUnreadCount() {
    this.unreadCount += 1;
  }

  markAsRead() {
    this.unreadCount = 0;
    this.updatedAt = new Date();
  }

  updateFromWhatsApp(data: any) {
    if (data.name) this.title = data.name;
    if (data.description) this.description = data.description;
    if (data.isMuted !== undefined) this.isMuted = data.isMuted;
    if (data.isPinned !== undefined) this.isPinned = data.isPinned;
    if (data.isArchived !== undefined) this.isArchived = data.isArchived;
    if (data.unreadCount !== undefined) this.unreadCount = data.unreadCount;
    if (data.participantCount !== undefined) this.participantCount = data.participantCount;
    if (data.labels) this.labels = data.labels;
    
    this.updatedAt = new Date();
  }

  // Métodos para gerenciar metadados
  setPriority(priority: 'low' | 'medium' | 'high' | 'urgent') {
    if (!this.metadata) this.metadata = {};
    this.metadata.priority = priority;
    this.updatedAt = new Date();
  }

  setStatus(status: 'open' | 'pending' | 'resolved' | 'closed') {
    if (!this.metadata) this.metadata = {};
    this.metadata.status = status;
    this.updatedAt = new Date();
  }

  addTag(tag: string) {
    if (!this.metadata) this.metadata = {};
    if (!this.metadata.tags) this.metadata.tags = [];
    if (!this.metadata.tags.includes(tag)) {
      this.metadata.tags.push(tag);
      this.updatedAt = new Date();
    }
  }

  removeTag(tag: string) {
    if (!this.metadata?.tags) return;
    this.metadata.tags = this.metadata.tags.filter(t => t !== tag);
    this.updatedAt = new Date();
  }
}

