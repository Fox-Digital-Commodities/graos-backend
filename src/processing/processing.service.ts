import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChatGPTService } from './chatgpt.service';
import { UploadService } from '../upload/upload.service';
import { IProcessingJob, ICardData } from '../common/interfaces/card-data.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);
  private processingJobs = new Map<string, IProcessingJob>();

  constructor(
    private chatGPTService: ChatGPTService,
    private uploadService: UploadService
  ) {}

  /**
   * Processa arquivo (imagem ou texto) com ChatGPT
   */
  async processFile(fileId: string): Promise<string> {
    this.logger.log(`Iniciando processamento do arquivo: ${fileId}`);

    // Buscar arquivo no UploadService
    const fileInfo = await this.uploadService.getFileById(fileId);
    if (!fileInfo) {
      throw new Error(`Arquivo não encontrado: ${fileId}`);
    }

    // Criar job de processamento
    const job: IProcessingJob = {
      id: fileId,
      filePath: fileInfo.path,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.processingJobs.set(fileId, job);

    // Processar de forma assíncrona
    this.processFileAsync(fileId, fileInfo.path);

    return fileId;
  }

  /**
   * Processa texto direto com ChatGPT
   */
  async processText(textContent: string): Promise<string> {
    const jobId = this.generateJobId();
    this.logger.log(`Iniciando processamento de texto: ${jobId}`);

    // Criar job de processamento
    const job: IProcessingJob = {
      id: jobId,
      filePath: 'text-prompt',
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.processingJobs.set(jobId, job);

    // Processar de forma assíncrona
    this.processTextAsync(jobId, textContent);

    return jobId;
  }

  /**
<<<<<<< HEAD
=======
   * Processa texto direto com ChatGPT (método legado)
   */
  async processTextPrompt(textContent: string): Promise<string> {
    return this.processText(textContent);
  }

  /**
>>>>>>> a531a25900eb57a0576a44cc76109bf4ac80a3d8
   * Obtém o status de um job de processamento
   */
  async getProcessingStatus(jobId: string): Promise<IProcessingJob> {
    const job = this.processingJobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Job de processamento não encontrado: ${jobId}`);
    }
    return job;
  }

  /**
   * Lista todos os jobs de processamento
   */
  async getAllJobs(): Promise<IProcessingJob[]> {
    return Array.from(this.processingJobs.values());
  }

  /**
   * Remove um job de processamento
   */
  async removeJob(jobId: string): Promise<void> {
    this.processingJobs.delete(jobId);
  }

  /**
   * Processamento assíncrono de arquivo
   */
  private async processFileAsync(jobId: string, filePath: string): Promise<void> {
    const job = this.processingJobs.get(jobId);
    if (!job) return;

    try {
      // Atualizar status
      job.status = 'processing';
      job.progress = 10;
      job.updatedAt = new Date();

      // Verificar se arquivo existe
      if (!fs.existsSync(filePath)) {
        throw new Error('Arquivo não encontrado');
      }

      job.progress = 30;
      job.updatedAt = new Date();

      // Determinar tipo de arquivo e processar
      const fileExtension = path.extname(filePath).toLowerCase();
      let result: ICardData;

      if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(fileExtension)) {
        // Processar imagem
        this.logger.log(`Processando imagem: ${filePath}`);
        result = await this.chatGPTService.processImageFile(filePath);
      } else if (['.txt', '.pdf'].includes(fileExtension)) {
        // Para arquivos de texto, ler conteúdo e processar
        this.logger.log(`Processando arquivo de texto: ${filePath}`);
        const textContent = fs.readFileSync(filePath, 'utf-8');
        result = await this.chatGPTService.processTextPrompt(textContent);
      } else {
        throw new Error(`Tipo de arquivo não suportado: ${fileExtension}`);
      }

      job.progress = 90;
      job.updatedAt = new Date();

      // Finalizar processamento
      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.updatedAt = new Date();

      this.logger.log(`Processamento concluído: ${jobId}`);

    } catch (error) {
      this.logger.error(`Erro no processamento ${jobId}:`, error.message);
      
      job.status = 'error';
      job.error = error.message;
      job.updatedAt = new Date();
    }
  }

  /**
   * Processamento assíncrono de texto
   */
  private async processTextAsync(jobId: string, textContent: string): Promise<void> {
    const job = this.processingJobs.get(jobId);
    if (!job) return;

    try {
      // Atualizar status
      job.status = 'processing';
      job.progress = 20;
      job.updatedAt = new Date();

      // Processar texto com ChatGPT
      this.logger.log(`Processando texto com ChatGPT: ${jobId}`);
      const result = await this.chatGPTService.processTextPrompt(textContent);

      job.progress = 90;
      job.updatedAt = new Date();

      // Finalizar processamento
      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.updatedAt = new Date();

      this.logger.log(`Processamento de texto concluído: ${jobId}`);

    } catch (error) {
      this.logger.error(`Erro no processamento de texto ${jobId}:`, error.message);
      
      job.status = 'error';
      job.error = error.message;
      job.updatedAt = new Date();
    }
  }

  /**
   * Gera ID único para job
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Testa a conexão com ChatGPT
   */
  async testChatGPTConnection(): Promise<boolean> {
    return this.chatGPTService.testConnection();
  }

  /**
   * Limpa jobs antigos (mais de 24 horas)
   */
  async cleanupOldJobs(): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [jobId, job] of this.processingJobs.entries()) {
      if (job.createdAt < oneDayAgo) {
        this.processingJobs.delete(jobId);
        cleaned++;
      }
    }

    this.logger.log(`Limpeza concluída: ${cleaned} jobs removidos`);
    return cleaned;
  }
}
