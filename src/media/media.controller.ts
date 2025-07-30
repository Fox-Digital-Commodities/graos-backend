import { Controller, Get, Query, Res, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { MediaService } from './media.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('media')
@Controller('media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  @Get('proxy')
  @ApiOperation({ 
    summary: 'Proxy para download de mídia',
    description: 'Faz download de arquivos de mídia (áudio, imagem) e serve localmente para contornar CORS'
  })
  @ApiQuery({ 
    name: 'url', 
    description: 'URL do arquivo de mídia para download',
    example: 'https://cdnydm.com/wh/example.oga'
  })
  @ApiQuery({ 
    name: 'type', 
    description: 'Tipo de mídia (audio ou image)',
    example: 'audio',
    required: false
  })
  @ApiResponse({ status: 200, description: 'Arquivo de mídia retornado com sucesso' })
  @ApiResponse({ status: 400, description: 'URL não fornecida ou inválida' })
  @ApiResponse({ status: 404, description: 'Arquivo não encontrado' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async proxyMedia(
    @Query('url') url: string,
    @Query('type') type: string = 'audio',
    @Res() res: Response,
  ) {
    if (!url) {
      throw new HttpException('URL é obrigatória', HttpStatus.BAD_REQUEST);
    }

    try {
      this.logger.log(`Fazendo proxy de ${type}: ${url}`);
      
      const mediaData = await this.mediaService.downloadMedia(url, type);
      
      // Definir headers apropriados baseado no tipo
      const contentType = this.getContentType(mediaData.mimeType, type);
      const filename = this.getFilename(url, type);
      
      res.set({
        'Content-Type': contentType,
        'Content-Length': mediaData.buffer.length.toString(),
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      });

      res.send(mediaData.buffer);
      
    } catch (error) {
      this.logger.error(`Erro ao fazer proxy de mídia: ${error.message}`, error.stack);
      
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        throw new HttpException('Arquivo não encontrado', HttpStatus.NOT_FOUND);
      }
      
      throw new HttpException(
        `Erro ao baixar mídia: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('download')
  @ApiOperation({ 
    summary: 'Download direto de mídia',
    description: 'Força download do arquivo de mídia'
  })
  @ApiQuery({ 
    name: 'url', 
    description: 'URL do arquivo de mídia para download'
  })
  @ApiQuery({ 
    name: 'filename', 
    description: 'Nome do arquivo para download',
    required: false
  })
  async downloadMedia(
    @Query('url') url: string,
    @Query('filename') filename: string,
    @Res() res: Response,
  ) {
    if (!url) {
      throw new HttpException('URL é obrigatória', HttpStatus.BAD_REQUEST);
    }

    try {
      this.logger.log(`Fazendo download de: ${url}`);
      
      const mediaData = await this.mediaService.downloadMedia(url);
      const downloadFilename = filename || this.getFilename(url);
      
      res.set({
        'Content-Type': mediaData.mimeType || 'application/octet-stream',
        'Content-Length': mediaData.buffer.length.toString(),
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Access-Control-Allow-Origin': '*',
      });

      res.send(mediaData.buffer);
      
    } catch (error) {
      this.logger.error(`Erro ao fazer download: ${error.message}`, error.stack);
      throw new HttpException(
        `Erro ao baixar arquivo: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getContentType(detectedMimeType: string, type: string): string {
    if (detectedMimeType) {
      return detectedMimeType;
    }

    // Fallback baseado no tipo
    switch (type) {
      case 'audio':
        return 'audio/ogg';
      case 'image':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
    }
  }

  private getFilename(url: string, type: string = 'file'): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      
      if (filename && filename.includes('.')) {
        return filename;
      }
      
      // Gerar nome baseado no tipo
      const timestamp = Date.now();
      switch (type) {
        case 'audio':
          return `audio_${timestamp}.oga`;
        case 'image':
          return `image_${timestamp}.jpg`;
        default:
          return `file_${timestamp}`;
      }
    } catch {
      const timestamp = Date.now();
      return `${type}_${timestamp}`;
    }
  }
}

