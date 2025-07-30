import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface MediaData {
  buffer: Buffer;
  mimeType: string;
  size: number;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly cacheDir = path.join(process.cwd(), 'media-cache');
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly timeout = 30000; // 30 segundos

  constructor() {
    // Criar diretório de cache se não existir
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      this.logger.log(`Diretório de cache criado: ${this.cacheDir}`);
    }
  }

  async downloadMedia(url: string, type: string = 'audio'): Promise<MediaData> {
    if (!url) {
      throw new HttpException('URL não fornecida', HttpStatus.BAD_REQUEST);
    }

    // Verificar cache primeiro
    const cacheKey = this.getCacheKey(url);
    const cachedFile = await this.getCachedFile(cacheKey);
    
    if (cachedFile) {
      this.logger.log(`Arquivo encontrado no cache: ${cacheKey}`);
      return cachedFile;
    }

    try {
      this.logger.log(`Baixando mídia de: ${url}`);
      
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: this.timeout,
        maxContentLength: this.maxFileSize,
        maxBodyLength: this.maxFileSize,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': type === 'audio' ? 'audio/*' : 'image/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const buffer = Buffer.from(response.data);
      const mimeType = response.headers['content-type'] || this.detectMimeType(buffer, type);
      
      this.logger.log(`Download concluído: ${buffer.length} bytes, tipo: ${mimeType}`);

      const mediaData: MediaData = {
        buffer,
        mimeType,
        size: buffer.length,
      };

      // Salvar no cache
      await this.cacheFile(cacheKey, mediaData);

      return mediaData;

    } catch (error) {
      this.logger.error(`Erro ao baixar mídia de ${url}:`, error.message);
      
      if (error.code === 'ENOTFOUND') {
        throw new HttpException('URL não encontrada', HttpStatus.NOT_FOUND);
      }
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new HttpException('Timeout ao baixar arquivo', HttpStatus.REQUEST_TIMEOUT);
      }
      
      if (error.response?.status === 404) {
        throw new HttpException('Arquivo não encontrado', HttpStatus.NOT_FOUND);
      }
      
      if (error.response?.status === 403) {
        throw new HttpException('Acesso negado ao arquivo', HttpStatus.FORBIDDEN);
      }

      throw new HttpException(
        `Erro ao baixar mídia: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getCacheKey(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  private async getCachedFile(cacheKey: string): Promise<MediaData | null> {
    try {
      const metaPath = path.join(this.cacheDir, `${cacheKey}.meta`);
      const dataPath = path.join(this.cacheDir, `${cacheKey}.data`);

      if (!fs.existsSync(metaPath) || !fs.existsSync(dataPath)) {
        return null;
      }

      // Verificar se o cache não expirou (24 horas)
      const stats = fs.statSync(metaPath);
      const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      
      if (ageHours > 24) {
        // Cache expirado, remover arquivos
        fs.unlinkSync(metaPath);
        fs.unlinkSync(dataPath);
        return null;
      }

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const buffer = fs.readFileSync(dataPath);

      return {
        buffer,
        mimeType: meta.mimeType,
        size: buffer.length,
      };

    } catch (error) {
      this.logger.warn(`Erro ao ler cache ${cacheKey}:`, error.message);
      return null;
    }
  }

  private async cacheFile(cacheKey: string, mediaData: MediaData): Promise<void> {
    try {
      const metaPath = path.join(this.cacheDir, `${cacheKey}.meta`);
      const dataPath = path.join(this.cacheDir, `${cacheKey}.data`);

      const meta = {
        mimeType: mediaData.mimeType,
        size: mediaData.size,
        cachedAt: new Date().toISOString(),
      };

      fs.writeFileSync(metaPath, JSON.stringify(meta));
      fs.writeFileSync(dataPath, mediaData.buffer);

      this.logger.log(`Arquivo salvo no cache: ${cacheKey}`);

    } catch (error) {
      this.logger.warn(`Erro ao salvar no cache ${cacheKey}:`, error.message);
      // Não falhar se não conseguir salvar no cache
    }
  }

  private detectMimeType(buffer: Buffer, type: string): string {
    // Detectar tipo MIME baseado nos primeiros bytes
    const header = buffer.toString('hex', 0, 12).toUpperCase();

    // Áudio
    if (header.startsWith('4F676753')) return 'audio/ogg'; // OGG
    if (header.startsWith('494433') || header.startsWith('FFFB')) return 'audio/mpeg'; // MP3
    if (header.startsWith('52494646')) return 'audio/wav'; // WAV
    if (header.startsWith('1A45DFA3')) return 'audio/webm'; // WebM

    // Imagem
    if (header.startsWith('FFD8FF')) return 'image/jpeg'; // JPEG
    if (header.startsWith('89504E47')) return 'image/png'; // PNG
    if (header.startsWith('47494638')) return 'image/gif'; // GIF
    if (header.startsWith('52494646') && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'; // WebP

    // Fallback baseado no tipo solicitado
    switch (type) {
      case 'audio':
        return 'audio/ogg';
      case 'image':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
    }
  }

  async clearCache(): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir);
      
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        fs.unlinkSync(filePath);
      }
      
      this.logger.log(`Cache limpo: ${files.length} arquivos removidos`);
      
    } catch (error) {
      this.logger.error('Erro ao limpar cache:', error.message);
    }
  }

  async getCacheStats(): Promise<{ files: number; totalSize: number }> {
    try {
      const files = fs.readdirSync(this.cacheDir);
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }
      
      return {
        files: files.length / 2, // Dividir por 2 porque cada arquivo tem .meta e .data
        totalSize,
      };
      
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas do cache:', error.message);
      return { files: 0, totalSize: 0 };
    }
  }
}

