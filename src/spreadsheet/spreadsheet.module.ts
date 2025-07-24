import { Module } from '@nestjs/common';
import { SpreadsheetController } from './spreadsheet.controller';
import { SpreadsheetService } from './spreadsheet.service';

@Module({
  controllers: [SpreadsheetController],
  providers: [SpreadsheetService]
})
export class SpreadsheetModule {}
