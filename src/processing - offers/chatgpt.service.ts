import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ICardData } from '../common/interfaces/card-data.interface';
import { IFoxData } from '../common/interfaces/fox-data.interface';
import { StringSimilarityUtil } from '../common/utils/string-similarity.util';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ChatGPTService implements OnModuleInit {
  private readonly logger = new Logger(ChatGPTService.name);
  private openai: OpenAI;
  private foxData: IFoxData[] = [];
  private extractionPrompt: string = '';

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('openai.apiKey'),
      baseURL: this.configService.get('openai.apiBase'),
    });
  }

  onModuleInit(): void {
    this.loadFoxData();
    this.loadExtractionPrompt();
  }

  /**
   * Carrega os dados do arquivo base_fox_v2.json
   */
  private loadFoxData(): void {
    try {
      const filePath = path.join(
        process.cwd(),
        'src',
        'common',
        'data',
        'base_fox_v2.json',
      );

      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsedData = JSON.parse(fileContent) as IFoxData[];
        this.foxData = parsedData;
        this.logger.log(
          `Dados carregados: ${this.foxData.length} registros encontrados`,
        );
      } else {
        this.logger.warn('Arquivo base_fox_v2.json não encontrado');
      }
    } catch (error) {
      this.logger.error(
        'Erro ao carregar arquivo base_fox_v2.json:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Busca os IDs da empresa e endereço com base na empresa e cidade
   * Implementa busca inteligente com tolerância a diferenças menores
   */
  private findFoxIds(
    empresa: string,
    cidade: string,
  ): {
    idFoxUser: string | null;
    idFoxAddresses: string | null;
    matchDetails?: {
      empresaMatch: string;
      cidadeMatch: string;
      empresaSimilarity: number;
      cidadeSimilarity: number;
    };
  } {
    if (!empresa || !cidade || !this.foxData.length) {
      return { idFoxUser: null, idFoxAddresses: null };
    }

    // Normaliza as strings para comparação (remove acentos, converte para minúsculo)
    const empresaNormalizada = StringSimilarityUtil.normalizeString(empresa);
    const cidadeNormalizada = StringSimilarityUtil.normalizeString(cidade);

    // Primeiro, tenta busca exata
    const exactMatch = this.foxData.find((item) => {
      const itemEmpresa = StringSimilarityUtil.normalizeString(item.EMPRESA);
      const itemCidade = StringSimilarityUtil.normalizeString(item.CIDADE);

      return (
        itemEmpresa === empresaNormalizada && itemCidade === cidadeNormalizada
      );
    });

    if (exactMatch) {
      this.logger.log(
        `✅ Match exato encontrado: ${exactMatch.EMPRESA} - ${exactMatch.CIDADE}`,
      );
      return {
        idFoxUser: exactMatch['ID DO SISTEMA'] || null,
        idFoxAddresses: exactMatch['ID ENDEREÇO'] || null,
        matchDetails: {
          empresaMatch: exactMatch.EMPRESA,
          cidadeMatch: exactMatch.CIDADE,
          empresaSimilarity: 1.0,
          cidadeSimilarity: 1.0,
        },
      };
    }

    // Se não encontrou match exato, busca por similaridade
    let bestMatch: IFoxData | null = null;
    let bestScore = 0;
    let bestEmpresaSimilarity = 0;
    let bestCidadeSimilarity = 0;

    // Threshold mínimo para considerar um match válido
    const SIMILARITY_THRESHOLD = 0.7;
    const COMBINED_THRESHOLD = 0.8;

    for (const item of this.foxData) {
      const itemEmpresa = StringSimilarityUtil.normalizeString(item.EMPRESA);
      const itemCidade = StringSimilarityUtil.normalizeString(item.CIDADE);

      // Calcula similaridade
      const empresaSimilarity = StringSimilarityUtil.calculateSimilarity(
        empresaNormalizada,
        itemEmpresa,
      );
      const cidadeSimilarity = StringSimilarityUtil.calculateSimilarity(
        cidadeNormalizada,
        itemCidade,
      );

      // Calcula pontuação combinada (empresa tem peso maior)
      const combinedScore = empresaSimilarity * 0.7 + cidadeSimilarity * 0.3;

      // Se as similaridades individuais e combinada estão acima do threshold
      if (
        empresaSimilarity >= SIMILARITY_THRESHOLD &&
        cidadeSimilarity >= SIMILARITY_THRESHOLD &&
        combinedScore >= COMBINED_THRESHOLD &&
        combinedScore > bestScore
      ) {
        bestMatch = item;
        bestScore = combinedScore;
        bestEmpresaSimilarity = empresaSimilarity;
        bestCidadeSimilarity = cidadeSimilarity;
      }
    }

    if (bestMatch) {
      this.logger.log(
        `🔍 Match por similaridade encontrado: ${bestMatch.EMPRESA} - ${bestMatch.CIDADE}` +
          ` (Empresa: ${(bestEmpresaSimilarity * 100).toFixed(1)}%, ` +
          `Cidade: ${(bestCidadeSimilarity * 100).toFixed(1)}%, ` +
          `Score: ${(bestScore * 100).toFixed(1)}%)`,
      );

      return {
        idFoxUser: bestMatch['ID DO SISTEMA'] || null,
        idFoxAddresses: bestMatch['ID ENDEREÇO'] || null,
        matchDetails: {
          empresaMatch: bestMatch.EMPRESA,
          cidadeMatch: bestMatch.CIDADE,
          empresaSimilarity: bestEmpresaSimilarity,
          cidadeSimilarity: bestCidadeSimilarity,
        },
      };
    }

    // Se não encontrou nenhum match, tenta apenas por empresa
    const empresaOnlyMatches = this.foxData.filter((item) => {
      const itemEmpresa = StringSimilarityUtil.normalizeString(item.EMPRESA);
      const empresaSimilarity = StringSimilarityUtil.calculateSimilarity(
        empresaNormalizada,
        itemEmpresa,
      );
      return empresaSimilarity >= SIMILARITY_THRESHOLD;
    });

    if (empresaOnlyMatches.length > 0) {
      // Ordena por similaridade e pega o melhor
      const bestEmpresaMatch = empresaOnlyMatches
        .map((item) => ({
          item,
          similarity: StringSimilarityUtil.calculateSimilarity(
            empresaNormalizada,
            StringSimilarityUtil.normalizeString(item.EMPRESA),
          ),
        }))
        .sort((a, b) => b.similarity - a.similarity)[0];

      this.logger.warn(
        `⚠️  Match apenas por empresa: ${bestEmpresaMatch.item.EMPRESA}` +
          ` (${(bestEmpresaMatch.similarity * 100).toFixed(1)}%) - ` +
          `Cidade não encontrada: ${cidade}`,
      );

      return {
        idFoxUser: bestEmpresaMatch.item['ID DO SISTEMA'] || null,
        idFoxAddresses: null, // Não retorna endereço se cidade não bateu
        matchDetails: {
          empresaMatch: bestEmpresaMatch.item.EMPRESA,
          cidadeMatch: '',
          empresaSimilarity: bestEmpresaMatch.similarity,
          cidadeSimilarity: 0,
        },
      };
    }

    this.logger.warn(`❌ Nenhum match encontrado para: ${empresa} - ${cidade}`);
    return { idFoxUser: null, idFoxAddresses: null };
  }

  /**
   * Getter para o prompt de extração carregado do arquivo
   */
  private get EXTRACTION_PROMPT(): string {
    return this.extractionPrompt || '';
  }

  private readonly cardDataTool = {
    type: 'function' as const,
    function: {
      name: 'extractCardData',
      description: 'Extrai dados de cards de preços de grãos',
      parameters: {
        type: 'object',
        properties: {
          titulo: {
            type: 'string',
            description: 'Título do card ou descrição',
          },
          empresa: {
            type: 'string',
            description: 'Nome da empresa compradora (ex: COFCO, LDC)',
          },
          dataReferencia: {
            type: 'string',
            description: 'Data de referência dos preços (YYYY-MM-DD)',
          },
          cotacaoDolar: {
            type: 'number',
            description: 'Cotação do dólar, se mencionada',
          },
          cbot: { type: 'number', description: 'Valor CBOT, se mencionado' },
          observacoes: {
            type: 'string',
            description: 'Observações ou disclaimers',
          },
          idFoxUser: {
            type: 'string',
            description: 'ID do usuário no sistema Fox, se aplicável',
          },
          produtos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nome: {
                  type: 'string',
                  description: 'Nome do produto (SOJA, MILHO, etc.)',
                },
                safra: { type: 'string', description: 'Safra (ex: 2024/2025)' },
                modalidade: {
                  type: 'string',
                  description: 'Modalidade (ex: FOB)',
                },
                uf: { type: 'string', description: 'UF (GO, MT, etc.)' },
                municipio: { type: 'string', description: 'Município' },
                idFoxAddresses: {
                  type: 'string',
                  description: 'ID do endereço no sistema Fox, se aplicável',
                },
                precos: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      embarque: {
                        type: 'string',
                        description: 'Data de inicio ou embarque (YYYY-MM-DD)',
                      },
                      pagamento: {
                        type: 'string',
                        description: 'Data de pagamento (YYYY-MM-DD)',
                      },
                      precoUsd: { type: 'number', description: 'Preço em USD' },
                      precoBrl: { type: 'number', description: 'Preço em BRL' },
                    },
                  },
                },
              },
            },
          },
        },
        required: ['produtos'],
      },
    },
  };

  private readonly toolChoice = {
    type: 'function' as const,
    function: { name: 'extractCardData' },
  };

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
            content: this.EXTRACTION_PROMPT,
          },
          {
            role: 'user',
            content: `Texto para análise:\n${textContent}`,
          },
        ],
        max_tokens: this.configService.get('openai.maxTokens') || 2000,
        temperature: this.configService.get('openai.temperature') || 0.1,
        tools: [this.cardDataTool],
        tool_choice: this.toolChoice,
      });

      const toolCalls = response.choices[0]?.message?.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        throw new Error('Resposta sem tool calls do ChatGPT');
      }

      // Extrair JSON diretamente da resposta da função
      const functionCall = toolCalls[0];
      if (functionCall.function.name !== 'extractCardData') {
        throw new Error('Função incorreta retornada pelo ChatGPT');
      }

      const extractedData = JSON.parse(
        functionCall.function.arguments,
      ) as Record<string, any>;
      this.logger.log('Texto processado com sucesso');

      return this.validateAndNormalizeData(extractedData);
    } catch (error) {
      this.logger.error(
        'Erro ao processar texto:',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `Falha no processamento de texto: ${error instanceof Error ? error.message : String(error)}`,
      );
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
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: this.EXTRACTION_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: this.configService.get('openai.maxTokens') || 2000,
        temperature: this.configService.get('openai.temperature') || 0.1,
        tools: [this.cardDataTool],
        tool_choice: this.toolChoice,
      });

      const toolCalls = response.choices[0]?.message?.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        throw new Error('Resposta sem tool calls do ChatGPT Vision');
      }

      // Extrair JSON diretamente da resposta da função
      const functionCall = toolCalls[0];
      if (functionCall.function.name !== 'extractCardData') {
        throw new Error('Função incorreta retornada pelo ChatGPT Vision');
      }

      const extractedData = JSON.parse(
        functionCall.function.arguments,
      ) as Record<string, any>;
      this.logger.log('Imagem processada com sucesso');

      return this.validateAndNormalizeData(extractedData);
    } catch (error) {
      this.logger.error(
        'Erro ao processar imagem:',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `Falha no processamento de imagem: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Valida e normaliza os dados extraídos
   */
  private validateAndNormalizeData(data: Record<string, any>): ICardData {
    // Validações básicas
    if (!data || typeof data !== 'object') {
      throw new Error('Dados extraídos inválidos');
    }

    // Normalizar datas
    if (data.dataReferencia) {
      data.dataReferencia = this.normalizeDate(String(data.dataReferencia));
    }

    // Normalizar produtos e preços
    if (data.produtos && Array.isArray(data.produtos)) {
      data.produtos = data.produtos.map((produto: Record<string, any>) => {
        // Adiciona IDs Fox se empresa e cidade estiverem presentes
        if (data.empresa && produto.municipio) {
          const foxIds = this.findFoxIds(
            String(data.empresa),
            String(produto.municipio),
          );
          produto.idFoxAddresses = foxIds.idFoxAddresses;

          // Só atualiza idFoxUser no nível do produto se não estiver definido no nível do card
          if (!data.idFoxUser) {
            data.idFoxUser = foxIds.idFoxUser;
          }
        }

        // Adicionar IDs de produtos específicos
        if (produto.nome && typeof produto.nome === 'string') {
          const nomeProdutoNormalizado = produto.nome.trim().toLowerCase();
          if (nomeProdutoNormalizado.includes('milho')) {
            produto.idProduto = '5e349bed3b0fd74ea91f1488';
          } else if (nomeProdutoNormalizado.includes('soja')) {
            produto.idProduto = '5e349bfe3b0fd74ea91f1489';
          } else if (nomeProdutoNormalizado.includes('sorgo')) {
            produto.idProduto = '5e349c053b0fd74ea91f148a';
          } else {
            produto.idProduto = null;
          }
        }

        if (produto.precos && Array.isArray(produto.precos)) {
          produto.precos = produto.precos.map((preco: Record<string, any>) => ({
            ...preco,
            pagamento: this.normalizeDate(String(preco.pagamento)),
            precoUsd: this.normalizeNumber(preco.precoUsd),
            precoBrl: this.normalizeNumber(preco.precoBrl),
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
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
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
        max_tokens: 10,
      });

      return !!response.choices[0]?.message?.content;
    } catch (error) {
      this.logger.error(
        'Erro na conexão com OpenAI:',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  /**
   * Carrega o prompt de extração do arquivo extraction-prompt.txt
   */
  private loadExtractionPrompt(): void {
    try {
      const filePath = path.join(
        process.cwd(),
        'src',
        'common',
        'data',
        'extraction-prompt.txt',
      );

      if (fs.existsSync(filePath)) {
        this.extractionPrompt = fs.readFileSync(filePath, 'utf8');
        this.logger.log('Prompt de extração carregado com sucesso');
      } else {
        this.logger.warn('Arquivo extraction-prompt.txt não encontrado');
      }
    } catch (error) {
      this.logger.error(
        'Erro ao carregar arquivo extraction-prompt.txt:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
