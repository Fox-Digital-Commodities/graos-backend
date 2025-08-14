import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePrecoDto {
  @IsString()
  embarque: string;

  @IsDateString()
  pagamento: string;

  @IsOptional()
  @IsNumber()
  precoUsd?: number;

  @IsNumber()
  precoBrl: number;
}

export class CreateProdutoDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  safra?: string;

  @IsOptional()
  @IsString()
  modalidade?: string;

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  municipio?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrecoDto)
  precos: CreatePrecoDto[];
}

export class CreateCardDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsDateString()
  dataReferencia: string;

  @IsOptional()
  @IsNumber()
  cotacaoDolar?: number;

  @IsOptional()
  @IsNumber()
  cbot?: number;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsString()
  arquivoOriginal?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProdutoDto)
  produtos: CreateProdutoDto[];
}
