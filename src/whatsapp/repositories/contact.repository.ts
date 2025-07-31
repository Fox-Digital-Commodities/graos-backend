import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { Contact } from '../entities/contact.entity';

@Injectable()
export class ContactRepository {
  constructor(
    @InjectRepository(Contact)
    private readonly repository: Repository<Contact>,
  ) {}

  // Buscar por WhatsApp ID
  async findByWhatsAppId(whatsappId: string): Promise<Contact | null> {
    return this.repository.findOne({
      where: { whatsappId },
      relations: ['conversations'],
    });
  }

  // Buscar por número de telefone
  async findByPhoneNumber(phoneNumber: string): Promise<Contact | null> {
    return this.repository.findOne({
      where: { phoneNumber },
      relations: ['conversations'],
    });
  }

  // Buscar todos os contatos ativos
  async findAllActive(): Promise<Contact[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { updatedAt: 'DESC' },
    });
  }

  // Buscar contatos por nome (busca parcial)
  async findByName(name: string): Promise<Contact[]> {
    return this.repository.find({
      where: [
        { displayName: Like(`%${name}%`), isActive: true },
        { pushName: Like(`%${name}%`), isActive: true },
      ],
      order: { displayName: 'ASC' },
    });
  }

  // Buscar contatos favoritos
  async findFavorites(): Promise<Contact[]> {
    return this.repository.find({
      where: { isFavorite: true, isActive: true },
      order: { displayName: 'ASC' },
    });
  }

  // Buscar grupos
  async findGroups(): Promise<Contact[]> {
    return this.repository.find({
      where: { isGroup: true, isActive: true },
      order: { displayName: 'ASC' },
    });
  }

  // Buscar contatos business
  async findBusinessContacts(): Promise<Contact[]> {
    return this.repository.find({
      where: { isBusiness: true, isActive: true },
      order: { displayName: 'ASC' },
    });
  }

  // Buscar contatos online (vistos recentemente)
  async findOnlineContacts(): Promise<Contact[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.repository
      .createQueryBuilder('contact')
      .where('contact.isActive = :isActive', { isActive: true })
      .andWhere('contact.lastSeen >= :fiveMinutesAgo', { fiveMinutesAgo })
      .orderBy('contact.lastSeen', 'DESC')
      .getMany();
  }

  // Buscar contatos por etiquetas
  async findByLabels(labels: string[]): Promise<Contact[]> {
    return this.repository
      .createQueryBuilder('contact')
      .where('contact.isActive = :isActive', { isActive: true })
      .andWhere('contact.labels && :labels', { labels })
      .orderBy('contact.displayName', 'ASC')
      .getMany();
  }

  // Criar ou atualizar contato
  async createOrUpdate(contactData: Partial<Contact>): Promise<Contact> {
    if (contactData.whatsappId) {
      const existing = await this.findByWhatsAppId(contactData.whatsappId);
      if (existing) {
        // Atualizar contato existente
        existing.updateFromWhatsApp(contactData);
        return this.repository.save(existing);
      }
    }

    // Criar novo contato
    const contact = this.repository.create(contactData);
    return this.repository.save(contact);
  }

  // Salvar contato
  async save(contact: Contact): Promise<Contact> {
    return this.repository.save(contact);
  }

  // Atualizar contato
  async update(id: string, updateData: Partial<Contact>): Promise<Contact | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  // Buscar por ID
  async findById(id: string): Promise<Contact | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['conversations'],
    });
  }

  // Deletar contato (soft delete)
  async softDelete(id: string): Promise<void> {
    await this.repository.update(id, { 
      isActive: false,
      updatedAt: new Date()
    });
  }

  // Deletar contato permanentemente
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  // Marcar como favorito
  async toggleFavorite(id: string): Promise<Contact> {
    const contact = await this.findById(id);
    if (!contact) {
      throw new Error('Contato não encontrado');
    }
    
    contact.isFavorite = !contact.isFavorite;
    return this.repository.save(contact);
  }

  // Bloquear/desbloquear contato
  async toggleBlock(id: string): Promise<Contact> {
    const contact = await this.findById(id);
    if (!contact) {
      throw new Error('Contato não encontrado');
    }
    
    contact.isBlocked = !contact.isBlocked;
    return this.repository.save(contact);
  }

  // Adicionar etiqueta
  async addLabel(id: string, label: string): Promise<Contact> {
    const contact = await this.findById(id);
    if (!contact) {
      throw new Error('Contato não encontrado');
    }
    
    if (!contact.labels) contact.labels = [];
    if (!contact.labels.includes(label)) {
      contact.labels.push(label);
      return this.repository.save(contact);
    }
    
    return contact;
  }

  // Remover etiqueta
  async removeLabel(id: string, label: string): Promise<Contact> {
    const contact = await this.findById(id);
    if (!contact) {
      throw new Error('Contato não encontrado');
    }
    
    if (contact.labels) {
      contact.labels = contact.labels.filter(l => l !== label);
      return this.repository.save(contact);
    }
    
    return contact;
  }

  // Estatísticas
  async getStats(): Promise<{
    total: number;
    active: number;
    groups: number;
    business: number;
    favorites: number;
    blocked: number;
    online: number;
  }> {
    const [
      total,
      active,
      groups,
      business,
      favorites,
      blocked,
      online
    ] = await Promise.all([
      this.repository.count(),
      this.repository.count({ where: { isActive: true } }),
      this.repository.count({ where: { isGroup: true, isActive: true } }),
      this.repository.count({ where: { isBusiness: true, isActive: true } }),
      this.repository.count({ where: { isFavorite: true, isActive: true } }),
      this.repository.count({ where: { isBlocked: true, isActive: true } }),
      this.findOnlineContacts().then(contacts => contacts.length),
    ]);

    return {
      total,
      active,
      groups,
      business,
      favorites,
      blocked,
      online,
    };
  }

  // Busca avançada
  async search(query: {
    search?: string;
    whatsappId?: string;
    name?: string;
    phoneNumber?: string;
    isGroup?: boolean;
    isBusiness?: boolean;
    isFavorite?: boolean;
    isBlocked?: boolean;
    labels?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ contacts: Contact[]; total: number }> {
    const queryBuilder = this.repository
      .createQueryBuilder('contact')
      .where('contact.isActive = :isActive', { isActive: true });

    // Busca genérica por nome, telefone ou WhatsApp ID
    if (query.search) {
      queryBuilder.andWhere(
        '(contact.displayName ILIKE :search OR contact.pushName ILIKE :search OR contact.phoneNumber ILIKE :search OR contact.whatsappId ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    // Busca específica por WhatsApp ID
    if (query.whatsappId) {
      queryBuilder.andWhere('contact.whatsappId = :whatsappId', { 
        whatsappId: query.whatsappId 
      });
    }

    if (query.name) {
      queryBuilder.andWhere(
        '(contact.displayName ILIKE :name OR contact.pushName ILIKE :name)',
        { name: `%${query.name}%` }
      );
    }

    if (query.phoneNumber) {
      queryBuilder.andWhere('contact.phoneNumber LIKE :phoneNumber', {
        phoneNumber: `%${query.phoneNumber}%`
      });
    }

    if (query.isGroup !== undefined) {
      queryBuilder.andWhere('contact.isGroup = :isGroup', { isGroup: query.isGroup });
    }

    if (query.isBusiness !== undefined) {
      queryBuilder.andWhere('contact.isBusiness = :isBusiness', { isBusiness: query.isBusiness });
    }

    if (query.isFavorite !== undefined) {
      queryBuilder.andWhere('contact.isFavorite = :isFavorite', { isFavorite: query.isFavorite });
    }

    if (query.isBlocked !== undefined) {
      queryBuilder.andWhere('contact.isBlocked = :isBlocked', { isBlocked: query.isBlocked });
    }

    if (query.labels && query.labels.length > 0) {
      queryBuilder.andWhere('contact.labels && :labels', { labels: query.labels });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('contact.displayName', 'ASC')
      .limit(query.limit || 50)
      .offset(query.offset || 0);

    const contacts = await queryBuilder.getMany();

    return { contacts, total };
  }
}

