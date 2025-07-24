import { Test, TestingModule } from '@nestjs/testing';
import { SpreadsheetService } from './spreadsheet.service';

describe('SpreadsheetService', () => {
  let service: SpreadsheetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpreadsheetService],
    }).compile();

    service = module.get<SpreadsheetService>(SpreadsheetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
