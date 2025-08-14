export interface IPrecoItem {
  embarque: string;
  pagamento: Date;
  precoUsd?: number;
  precoBrl: number;
}

export interface IProduto {
  nome: string;
  idProduto?: string | null;
  safra?: string;
  modalidade?: string;
  uf?: string;
  municipio?: string;
  idFoxAddresses?: string | null;
  precos: IPrecoItem[];
}

export interface ICardData {
  titulo?: string;
  empresa?: string;
  dataReferencia: Date;
  cotacaoDolar?: number;
  cbot?: number;
  observacoes?: string;
  idFoxUser?: string | null;
  endereco?: string | null;
  janelaRetirada?: string | null;
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
