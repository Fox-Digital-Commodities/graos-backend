import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadResponseDto } from '../common/dto/upload.dto';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface FileRecord {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedAt: Date;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadPath: string;
  private readonly fileRecords: Map<string, FileRecord> = new Map();

  constructor(private configService: ConfigService) {
    this.uploadPath = this.configService.get('app.uploadPath') || './uploads';
    this.ensureUploadDirectory();
    this.loadExistingFiles();
  }

  /**
   * Garante que o diretório de upload existe
   */
  private ensureUploadDirectory(): void {
    try {
      if (!fs.existsSync(this.uploadPath)) {
        fs.mkdirSync(this.uploadPath, { recursive: true });
        this.logger.log(`Diretório de upload criado: ${this.uploadPath}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao criar diretório de upload: ${error.message}`);
      throw new Error('Falha na configuração do diretório de upload');
    }
  }

  /**
   * Carrega arquivos existentes no diretório
   */
  private loadExistingFiles(): void {
    try {
      if (fs.existsSync(this.uploadPath)) {
        const files = fs.readdirSync(this.uploadPath);
        files.forEach(filename => {
          const filePath = path.join(this.uploadPath, filename);
          const stats = fs.statSync(filePath);
          
          if (stats.isFile()) {
            const id = uuidv4();
            const record: FileRecord = {
              id,
              filename,
              originalName: filename,
              mimetype: this.getMimeType(filename),
              size: stats.size,
              path: filePath,
              uploadedAt: stats.birthtime,
            };
            this.fileRecords.set(id, record);
          }
        });
        this.logger.log(`${this.fileRecords.size} arquivos existentes carregados`);
      }
    } catch (error) {
      this.logger.error(`Erro ao carregar arquivos existentes: ${error.message}`);
    }
  }

  /**
   * Salva arquivo enviado
   */
  async saveFile(file: Express.Multer.File): Promise<UploadResponseDto> {
    try {
      this.logger.log(`Processando upload: ${file.originalname}`);

      // Validar arquivo
      this.validateFile(file);

      // Gerar ID único
      const id = uuidv4();
      
      // Criar registro do arquivo
      const record: FileRecord = {
        id,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        uploadedAt: new Date(),
      };

      // Salvar no mapa de registros
      this.fileRecords.set(id, record);

      this.logger.log(`Arquivo salvo com sucesso: ${file.originalname} (ID: ${id})`);

      return {
        id,
        filename: record.filename,
        originalName: record.originalName,
        mimetype: record.mimetype,
        size: record.size,
        path: record.path,
        uploadedAt: record.uploadedAt,
      };
    } catch (error) {
      this.logger.error(`Erro ao salvar arquivo: ${error.message}`);
      
      // Limpar arquivo se houve erro
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          this.logger.error(`Erro ao limpar arquivo: ${cleanupError.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Lista todos os arquivos
   */
  async listFiles(): Promise<UploadResponseDto[]> {
    const files = Array.from(this.fileRecords.values()).map(record => ({
      id: record.id,
      filename: record.filename,
      originalName: record.originalName,
      mimetype: record.mimetype,
      size: record.size,
      path: record.path,
      uploadedAt: record.uploadedAt,
    }));

    // Ordenar por data de upload (mais recente primeiro)
    files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    return files;
  }

  /**
   * Obtém arquivo por ID
   */
  async getFileById(id: string): Promise<UploadResponseDto | null> {
    const record = this.fileRecords.get(id);
    if (!record) {
      return null;
    }

    // Verificar se arquivo ainda existe no disco
    if (!fs.existsSync(record.path)) {
      this.logger.warn(`Arquivo não encontrado no disco: ${record.path}`);
      this.fileRecords.delete(id);
      return null;
    }

    return {
      id: record.id,
      filename: record.filename,
      originalName: record.originalName,
      mimetype: record.mimetype,
      size: record.size,
      path: record.path,
      uploadedAt: record.uploadedAt,
    };
  }

  /**
   * Remove arquivo
   */
  async deleteFile(id: string): Promise<void> {
    const record = this.fileRecords.get(id);
    if (!record) {
      throw new HttpException('Arquivo não encontrado', HttpStatus.NOT_FOUND);
    }

    try {
      // Remover arquivo do disco
      if (fs.existsSync(record.path)) {
        fs.unlinkSync(record.path);
        this.logger.log(`Arquivo removido do disco: ${record.path}`);
      }

      // Remover do mapa de registros
      this.fileRecords.delete(id);
      
      this.logger.log(`Arquivo removido com sucesso: ${record.originalName} (ID: ${id})`);
    } catch (error) {
      this.logger.error(`Erro ao remover arquivo: ${error.message}`);
      throw new HttpException(
        'Erro ao remover arquivo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Valida arquivo enviado
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new HttpException('Nenhum arquivo fornecido', HttpStatus.BAD_REQUEST);
    }

    const allowedTypes = this.configService.get('app.allowedFileTypes');
    if (!allowedTypes.includes(file.mimetype)) {
      throw new HttpException(
        `Tipo de arquivo não permitido: ${file.mimetype}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const maxSize = this.configService.get('app.maxFileSize');
    if (file.size > maxSize) {
      throw new HttpException(
        `Arquivo muito grande: ${file.size} bytes (máximo: ${maxSize} bytes)`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Determina MIME type baseado na extensão do arquivo
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Obtém estatísticas do serviço
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: { [key: string]: number };
  }> {
    const files = Array.from(this.fileRecords.values());
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    const fileTypes: { [key: string]: number } = {};
    files.forEach(file => {
      fileTypes[file.mimetype] = (fileTypes[file.mimetype] || 0) + 1;
    });

    return {
      totalFiles,
      totalSize,
      fileTypes,
    };
  }

  /**
   * Limpa arquivos antigos (mais de 7 dias)
   */
  async cleanupOldFiles(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let cleanedCount = 0;
    const filesToDelete: string[] = [];

    this.fileRecords.forEach((record, id) => {
      if (record.uploadedAt < cutoffDate) {
        filesToDelete.push(id);
      }
    });

    for (const id of filesToDelete) {
      try {
        await this.deleteFile(id);
        cleanedCount++;
      } catch (error) {
        this.logger.error(`Erro ao limpar arquivo ${id}: ${error.message}`);
      }
    }

    this.logger.log(`${cleanedCount} arquivos antigos removidos`);
    return cleanedCount;
  }
}

