import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from './conversation.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  STICKER = 'sticker',
  LOCATION = 'location',
  CONTACT = 'contact',
  PTT = 'ptt', // Push to Talk (áudio)
  VOICE = 'voice',
  SYSTEM = 'system', // Mensagens do sistema (entrou no grupo, etc)
  POLL = 'poll',
  REACTION = 'reaction',
  REVOKED = 'revoked', // Mensagem apagada
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Entity('messages')
@Index(['whatsappId'], { unique: true }) // Índice único para WhatsApp message ID
@Index(['conversationId']) // Índice para busca por conversa
@Index(['timestamp']) // Índice para ordenação por timestamp
@Index(['fromMe']) // Índice para filtrar por remetente
@Index(['type']) // Índice para filtrar por tipo
export class Message {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ name: 'whatsapp_id', unique: true, nullable: false })
  whatsappId: string; // ID único da mensagem no WhatsApp

  @Column({ name: 'conversation_id', nullable: false })
  conversationId: string; // ID da conversa

  @Column({ name: 'from_me', default: false })
  fromMe: boolean; // Se a mensagem foi enviada por nós

  @Column({ name: 'author', nullable: true })
  author: string; // Autor da mensagem (para grupos)

  @Column({ name: 'type', type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType; // Tipo da mensagem

  @Column({ name: 'body', type: 'text', nullable: true })
  body: string; // Conteúdo da mensagem

  @Column({ name: 'caption', type: 'text', nullable: true })
  caption: string; // Legenda (para mídias)

  @Column({ name: 'timestamp', type: 'timestamp' })
  timestamp: Date; // Timestamp da mensagem

  @Column({ name: 'status', type: 'enum', enum: MessageStatus, default: MessageStatus.PENDING })
  status: MessageStatus; // Status da mensagem

  @Column({ name: 'is_forwarded', default: false })
  isForwarded: boolean; // Se foi encaminhada

  @Column({ name: 'forward_count', default: 0 })
  forwardCount: number; // Quantas vezes foi encaminhada

  @Column({ name: 'is_starred', default: false })
  isStarred: boolean; // Se está marcada com estrela

  @Column({ name: 'is_broadcast', default: false })
  isBroadcast: boolean; // Se é mensagem de broadcast

  @Column({ name: 'quoted_message_id', nullable: true })
  quotedMessageId: string; // ID da mensagem citada/respondida

  @Column({ name: 'quoted_message_body', type: 'text', nullable: true })
  quotedMessageBody: string; // Corpo da mensagem citada

  // Campos específicos para mídia
  @Column({ name: 'media_url', nullable: true })
  mediaUrl: string; // URL da mídia

  @Column({ name: 'media_mime_type', nullable: true })
  mediaMimeType: string; // Tipo MIME da mídia

  @Column({ name: 'media_size', nullable: true })
  mediaSize: number; // Tamanho da mídia em bytes

  @Column({ name: 'media_filename', nullable: true })
  mediaFilename: string; // Nome do arquivo

  @Column({ name: 'media_duration', nullable: true })
  mediaDuration: number; // Duração (para áudio/vídeo) em segundos

  @Column({ name: 'media_width', nullable: true })
  mediaWidth: number; // Largura (para imagem/vídeo)

  @Column({ name: 'media_height', nullable: true })
  mediaHeight: number; // Altura (para imagem/vídeo)

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string; // URL da thumbnail

  // Campos específicos para localização
  @Column({ name: 'location_latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  locationLatitude: number; // Latitude

  @Column({ name: 'location_longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  locationLongitude: number; // Longitude

  @Column({ name: 'location_description', nullable: true })
  locationDescription: string; // Descrição da localização

  // Campos específicos para contato
  @Column({ name: 'contact_vcard', type: 'text', nullable: true })
  contactVcard: string; // vCard do contato compartilhado

  // Campos para transcrição de áudio
  @Column({ name: 'transcription', type: 'text', nullable: true })
  transcription: string; // Transcrição do áudio

  @Column({ name: 'transcription_confidence', type: 'decimal', precision: 3, scale: 2, nullable: true })
  transcriptionConfidence: number; // Confiança da transcrição (0-1)

  @Column({ name: 'transcription_language', nullable: true })
  transcriptionLanguage: string; // Idioma da transcrição

  // Metadados adicionais
  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: {
    reactions?: {
      emoji: string;
      author: string;
      timestamp: Date;
    }[];
    mentions?: string[]; // IDs dos usuários mencionados
    links?: {
      url: string;
      title?: string;
      description?: string;
      image?: string;
    }[];
    businessContext?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    urgency?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    customFields?: Record<string, any>;
  }; // Metadados da mensagem

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean; // Se foi deletada

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date; // Quando foi deletada

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relacionamentos
  @ManyToOne(() => Conversation, conversation => conversation.messages)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  // Métodos auxiliares
  getDisplayText(): string {
    if (this.body) return this.body;
    if (this.caption) return this.caption;
    if (this.transcription) return this.transcription;
    
    switch (this.type) {
      case MessageType.IMAGE: return '[Imagem]';
      case MessageType.AUDIO:
      case MessageType.PTT:
      case MessageType.VOICE: return '[Áudio]';
      case MessageType.VIDEO: return '[Vídeo]';
      case MessageType.DOCUMENT: return `[Documento${this.mediaFilename ? `: ${this.mediaFilename}` : ''}]`;
      case MessageType.STICKER: return '[Figurinha]';
      case MessageType.LOCATION: return '[Localização]';
      case MessageType.CONTACT: return '[Contato]';
      case MessageType.POLL: return '[Enquete]';
      case MessageType.REVOKED: return '[Mensagem apagada]';
      default: return '[Mídia]';
    }
  }

  isMedia(): boolean {
    return [
      MessageType.IMAGE,
      MessageType.AUDIO,
      MessageType.VIDEO,
      MessageType.DOCUMENT,
      MessageType.STICKER,
      MessageType.PTT,
      MessageType.VOICE
    ].includes(this.type);
  }

  isAudio(): boolean {
    return [MessageType.AUDIO, MessageType.PTT, MessageType.VOICE].includes(this.type);
  }

  hasTranscription(): boolean {
    return !!this.transcription && this.transcription.length > 0;
  }

  shouldTranscribe(): boolean {
    return this.isAudio() && 
           !this.hasTranscription() && 
           !!this.mediaDuration && 
           this.mediaDuration <= 30; // Só transcrever áudios <= 30 segundos
  }

  setTranscription(text: string, confidence: number, language: string = 'pt') {
    this.transcription = text;
    this.transcriptionConfidence = confidence;
    this.transcriptionLanguage = language;
    this.updatedAt = new Date();
  }

  addReaction(emoji: string, author: string) {
    if (!this.metadata) this.metadata = {};
    if (!this.metadata.reactions) this.metadata.reactions = [];
    
    // Remover reação anterior do mesmo autor
    this.metadata.reactions = this.metadata.reactions.filter(r => r.author !== author);
    
    // Adicionar nova reação
    this.metadata.reactions.push({
      emoji,
      author,
      timestamp: new Date()
    });
    
    this.updatedAt = new Date();
  }

  removeReaction(author: string) {
    if (!this.metadata?.reactions) return;
    
    this.metadata.reactions = this.metadata.reactions.filter(r => r.author !== author);
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

  setSentiment(sentiment: 'positive' | 'negative' | 'neutral') {
    if (!this.metadata) this.metadata = {};
    this.metadata.sentiment = sentiment;
    this.updatedAt = new Date();
  }

  setUrgency(urgency: 'low' | 'medium' | 'high' | 'urgent') {
    if (!this.metadata) this.metadata = {};
    this.metadata.urgency = urgency;
    this.updatedAt = new Date();
  }

  markAsDeleted() {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  updateFromWhatsApp(data: any) {
    if (data.body !== undefined) this.body = data.body;
    if (data.caption !== undefined) this.caption = data.caption;
    if (data.type) this.type = data.type;
    if (data.timestamp) this.timestamp = new Date(data.timestamp * 1000);
    if (data.isForwarded !== undefined) this.isForwarded = data.isForwarded;
    if (data.isStarred !== undefined) this.isStarred = data.isStarred;
    if (data.mediaUrl) this.mediaUrl = data.mediaUrl;
    if (data.mediaMimeType) this.mediaMimeType = data.mediaMimeType;
    if (data.mediaSize) this.mediaSize = data.mediaSize;
    if (data.mediaFilename) this.mediaFilename = data.mediaFilename;
    if (data.mediaDuration) this.mediaDuration = data.mediaDuration;
    
    this.updatedAt = new Date();
  }
}

