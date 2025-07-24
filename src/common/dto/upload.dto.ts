export class UploadResponseDto {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedAt: Date;
}

export class ProcessingStatusDto {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  message?: string;
  result?: any;
  error?: string;
}

