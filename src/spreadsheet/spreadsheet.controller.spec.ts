import { Test, TestingModule } from '@nestjs/testing';
import { SpreadsheetController } from './spreadsheet.controller';

describe('SpreadsheetController', () => {
  let controller: SpreadsheetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpreadsheetController],
    }).compile();

    controller = module.get<SpreadsheetController>(SpreadsheetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
