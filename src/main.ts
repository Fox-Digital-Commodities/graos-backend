import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Configuração CORS
  app.enableCors({
    origin: configService.get('app.corsOrigins'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-whatsapp-instance'],
    credentials: true,
  });

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Permitir campos não listados temporariamente
      transform: true,
      skipMissingProperties: false,
    }),
  );

  // Prefixo global para APIs
  app.setGlobalPrefix('api');

  // Configuração Swagger
  const config = new DocumentBuilder()
    .setTitle('Grãos API')
    .setDescription('API para processamento de cards de preços de grãos')
    .setVersion('1.0')
    .addTag('upload', 'Endpoints para upload de arquivos')
    .addTag('processing', 'Endpoints para processamento de dados')
    .addTag('cards', 'Endpoints para gerenciamento de cards')
    .addTag('spreadsheet', 'Endpoints para geração de planilhas')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('app.port');
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Aplicação rodando em: http://localhost:${port}`);
  console.log(`📚 Documentação Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
