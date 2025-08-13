import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadService } from './upload.service';
import { UploadResponseDto } from '../common/dto/upload.dto';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: 'Upload de arquivo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo para upload (PNG, JPG, PDF, TXT)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Arquivo enviado com sucesso',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo inválido ou não fornecido',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedTypes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'application/pdf',
          'text/plain',
        ];
        if (allowedTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Tipo de arquivo não permitido'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new HttpException(
        'Nenhum arquivo foi fornecido',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.uploadService.saveFile(file);
      return result;
    } catch (error) {
      throw new HttpException(
        `Erro ao processar upload: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('multiple')
  @ApiOperation({ summary: 'Upload de múltiplos arquivos' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Arquivos para upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Arquivos enviados com sucesso',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/UploadResponseDto' },
    },
  })
  @UseInterceptors(FileInterceptor('files'))
  async uploadMultipleFiles(
    @UploadedFile() files: Express.Multer.File[],
  ): Promise<UploadResponseDto[]> {
    if (!files || files.length === 0) {
      throw new HttpException(
        'Nenhum arquivo foi fornecido',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const results = await Promise.all(
        files.map((file) => this.uploadService.saveFile(file)),
      );
      return results;
    } catch (error) {
      throw new HttpException(
        `Erro ao processar uploads: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar arquivos enviados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de arquivos',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/UploadResponseDto' },
    },
  })
  async listFiles(): Promise<UploadResponseDto[]> {
    try {
      return await this.uploadService.listFiles();
    } catch (error) {
      throw new HttpException(
        `Erro ao listar arquivos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter informações de um arquivo específico' })
  @ApiResponse({
    status: 200,
    description: 'Informações do arquivo',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Arquivo não encontrado',
  })
  async getFile(@Param('id') id: string): Promise<UploadResponseDto> {
    try {
      const file = await this.uploadService.getFileById(id);
      if (!file) {
        throw new HttpException('Arquivo não encontrado', HttpStatus.NOT_FOUND);
      }
      return file;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Erro ao obter arquivo: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover arquivo' })
  @ApiResponse({
    status: 200,
    description: 'Arquivo removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Arquivo não encontrado',
  })
  async deleteFile(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.uploadService.deleteFile(id);
      return { message: 'Arquivo removido com sucesso' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Erro ao remover arquivo: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health/check')
  @ApiOperation({ summary: 'Verificar saúde do serviço de upload' })
  @ApiResponse({
    status: 200,
    description: 'Serviço funcionando',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        message: { type: 'string' },
        timestamp: { type: 'string' },
      },
    },
  })
  async healthCheck(): Promise<{
    status: string;
    message: string;
    timestamp: string;
  }> {
    return {
      status: 'ok',
      message: 'Serviço de upload funcionando corretamente',
      timestamp: new Date().toISOString(),
    };
  }
}
