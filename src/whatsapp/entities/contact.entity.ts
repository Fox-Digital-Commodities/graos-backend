import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from './conversation.entity';

@Entity('contacts')
@Index(['whatsappId'], { unique: true }) // Índice único para WhatsApp ID
@Index(['phoneNumber']) // Índice para busca por telefone
export class Contact {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ name: 'whatsapp_id', unique: true, nullable: false })
  whatsappId: string; // ID único do WhatsApp (ex: 5511999887766@c.us)

  @Column({ name: 'phone_number', nullable: false })
  phoneNumber: string; // Número de telefone (ex: +5511999887766)

  @Column({ name: 'display_name', nullable: true })
  displayName: string; // Nome exibido no WhatsApp

  @Column({ name: 'push_name', nullable: true })
  pushName: string; // Nome do push notification

  @Column({ name: 'profile_picture_url', nullable: true })
  profilePictureUrl: string; // URL da foto de perfil

  @Column({ name: 'is_business', default: false })
  isBusiness: boolean; // Se é conta business

  @Column({ name: 'is_group', default: false })
  isGroup: boolean; // Se é um grupo

  @Column({ name: 'group_participants', type: 'json', nullable: true })
  groupParticipants: {
    id: string;
    name: string;
    isAdmin: boolean;
  }[]; // Participantes do grupo (se for grupo)

  @Column({ name: 'last_seen', type: 'timestamp', nullable: true })
  lastSeen: Date; // Última vez visto online

  @Column({ name: 'status_message', nullable: true })
  statusMessage: string; // Mensagem de status/sobre

  @Column({ name: 'is_blocked', default: false })
  isBlocked: boolean; // Se está bloqueado

  @Column({ name: 'is_favorite', default: false })
  isFavorite: boolean; // Se está nos favoritos

  @Column({ name: 'labels', type: 'json', nullable: true })
  labels: string[]; // Etiquetas/labels do contato

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: {
    businessCategory?: string;
    businessDescription?: string;
    businessHours?: string;
    customFields?: Record<string, any>;
  }; // Metadados adicionais

  @Column({ name: 'is_active', default: true })
  isActive: boolean; // Se o contato está ativo

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relacionamentos
  @OneToMany(() => Conversation, conversation => conversation.contact)
  conversations: Conversation[];

  // Métodos auxiliares
  getFormattedPhone(): string {
    return this.phoneNumber.replace(/\D/g, '');
  }

  getDisplayNameOrPhone(): string {
    return this.displayName || this.pushName || this.phoneNumber;
  }

  isOnline(): boolean {
    if (!this.lastSeen) return false;
    const now = new Date();
    const diffMinutes = (now.getTime() - this.lastSeen.getTime()) / (1000 * 60);
    return diffMinutes <= 5; // Considera online se visto nos últimos 5 minutos
  }

  updateFromWhatsApp(data: any) {
    if (data.name) this.displayName = data.name;
    if (data.pushname) this.pushName = data.pushname;
    if (data.profilePicUrl) this.profilePictureUrl = data.profilePicUrl;
    if (data.isBusiness !== undefined) this.isBusiness = data.isBusiness;
    if (data.isGroup !== undefined) this.isGroup = data.isGroup;
    if (data.groupParticipants) this.groupParticipants = data.groupParticipants;
    if (data.statusMessage) this.statusMessage = data.statusMessage;
    if (data.labels) this.labels = data.labels;
    
    this.updatedAt = new Date();
  }
}

