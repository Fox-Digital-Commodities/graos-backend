export interface IPrecoItem {
  embarque: string;
  pagamento: Date;
  precoUsd?: number;
  precoBrl: number;
}

export interface IProduto {
  nome: string;
  safra?: string;
  modalidade?: string;
  uf?: string;
  municipio?: string;
  precos: IPrecoItem[];
}

export interface ICardData {
  titulo?: string;
  dataReferencia: Date;
  cotacaoDolar?: number;
  cbot?: number;
  observacoes?: string;
  produtos: IProduto[];
}

export interface IProcessingJob {
  id: string;
  filePath: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: ICardData;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

