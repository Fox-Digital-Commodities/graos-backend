import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ICardData } from '../common/interfaces/card-data.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ChatGPTService {
  private readonly logger = new Logger(ChatGPTService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('openai.apiKey'),
      baseURL: this.configService.get('openai.apiBase'),
    });
  }

  private readonly EXTRACTION_PROMPT = `
Analise este card de preços de grãos e extraia os dados em formato JSON estruturado.

IMPORTANTE: Retorne APENAS o JSON válido, sem explicações ou texto adicional.

Formato esperado:
{
  "titulo": "string (título do card ou descrição)",
  "dataReferencia": "YYYY-MM-DD (data de referência dos preços)",
  "cotacaoDolar": number (cotação do dólar, se mencionada),
  "cbot": number (valor CBOT, se mencionado),
  "observacoes": "string (observações ou disclaimers)",
  "produtos": [
    {
      "nome": "string (nome do produto: SOJA, MILHO, etc.)",
      "safra": "string (período da safra: 2024/2025, etc.)",
      "modalidade": "string (FOB, CIF, etc.)",
      "uf": "string (estado: GO, MT, etc.)",
      "municipio": "string (município)",
      "precos": [
        {
          "embarque": "string (período de embarque: SETEMBRO, etc.)",
          "pagamento": "YYYY-MM-DD (data de pagamento)",
          "precoUsd": number (preço em dólares, se disponível),
          "precoBrl": number (preço em reais)"
        }
      ]
    }
  ]
}

Regras de extração:
1. Se não encontrar um campo, use null
2. Converta datas para formato YYYY-MM-DD
3. Extraia valores numéricos removendo símbolos de moeda
4. Identifique produtos mesmo se não explicitamente nomeados
5. Agrupe preços por produto
6. Mantenha a estrutura hierárquica: Card > Produtos > Preços
`;

  /**
   * Processa texto direto com ChatGPT
   */
  async processTextPrompt(textContent: string): Promise<ICardData> {
    try {
      this.logger.log('Processando texto com ChatGPT...');

      const response = await this.openai.chat.completions.create({
        model: this.configService.get('openai.model') || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de dados de commodities agrícolas. Extraia informações de cards de preços de grãos com precisão.'
          },
          {
            role: 'user',
            content: `${this.EXTRACTION_PROMPT}\n\nTexto para análise:\n${textContent}`
          }
        ],
        max_tokens: this.configService.get('openai.maxTokens') || 2000,
        temperature: this.configService.get('openai.temperature') || 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia do ChatGPT');
      }

      // Limpar resposta e extrair JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON não encontrado na resposta do ChatGPT');
      }

      const extractedData = JSON.parse(jsonMatch[0]);
      this.logger.log('Texto processado com sucesso');
      
      return this.validateAndNormalizeData(extractedData);
    } catch (error) {
      this.logger.error('Erro ao processar texto:', error.message);
      throw new Error(`Falha no processamento de texto: ${error.message}`);
    }
  }

  /**
   * Processa imagem com ChatGPT Vision
   */
  async processImageFile(filePath: string): Promise<ICardData> {
    try {
      this.logger.log(`Processando imagem: ${filePath}`);

      // Verificar se arquivo existe
      if (!fs.existsSync(filePath)) {
        throw new Error('Arquivo de imagem não encontrado');
      }

      // Ler arquivo e converter para base64
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(filePath);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de documentos de commodities agrícolas. Analise imagens de cards de preços de grãos com precisão.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: this.EXTRACTION_PROMPT
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: this.configService.get('openai.maxTokens') || 2000,
        temperature: this.configService.get('openai.temperature') || 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia do ChatGPT Vision');
      }

      // Limpar resposta e extrair JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON não encontrado na resposta do ChatGPT Vision');
      }

      const extractedData = JSON.parse(jsonMatch[0]);
      this.logger.log('Imagem processada com sucesso');
      
      return this.validateAndNormalizeData(extractedData);
    } catch (error) {
      this.logger.error('Erro ao processar imagem:', error.message);
      throw new Error(`Falha no processamento de imagem: ${error.message}`);
    }
  }

  /**
   * Valida e normaliza os dados extraídos
   */
  private validateAndNormalizeData(data: any): ICardData {
    // Validações básicas
    if (!data || typeof data !== 'object') {
      throw new Error('Dados extraídos inválidos');
    }

    // Normalizar datas
    if (data.dataReferencia) {
      data.dataReferencia = this.normalizeDate(data.dataReferencia);
    }

    // Normalizar produtos e preços
    if (data.produtos && Array.isArray(data.produtos)) {
      data.produtos = data.produtos.map(produto => {
        if (produto.precos && Array.isArray(produto.precos)) {
          produto.precos = produto.precos.map(preco => ({
            ...preco,
            pagamento: this.normalizeDate(preco.pagamento),
            precoUsd: this.normalizeNumber(preco.precoUsd),
            precoBrl: this.normalizeNumber(preco.precoBrl)
          }));
        }
        return produto;
      });
    }

    // Normalizar valores numéricos
    data.cotacaoDolar = this.normalizeNumber(data.cotacaoDolar);
    data.cbot = this.normalizeNumber(data.cbot);

    return data as ICardData;
  }

  /**
   * Normaliza datas para formato ISO
   */
  private normalizeDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    try {
      // Tentar diferentes formatos de data
      const formats = [
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
        /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          if (format === formats[0]) {
            // YYYY-MM-DD
            return new Date(dateStr);
          } else {
            // DD/MM/YYYY ou DD-MM-YYYY
            const [, day, month, year] = match;
            return new Date(`${year}-${month}-${day}`);
          }
        }
      }

      // Tentar parsing direto
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  /**
   * Normaliza números removendo símbolos de moeda
   */
  private normalizeNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    
    if (typeof value === 'number') return value;
    
    if (typeof value === 'string') {
      // Remover símbolos de moeda e espaços
      const cleaned = value.replace(/[R$\s,]/g, '').replace(',', '.');
      const number = parseFloat(cleaned);
      return isNaN(number) ? null : number;
    }
    
    return null;
  }

  /**
   * Determina o MIME type do arquivo
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Testa a conexão com a API da OpenAI
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Teste de conexão' }],
        max_tokens: 10
      });
      
      return !!response.choices[0]?.message?.content;
    } catch (error) {
      this.logger.error('Erro na conexão com OpenAI:', error.message);
      return false;
    }
  }
}

