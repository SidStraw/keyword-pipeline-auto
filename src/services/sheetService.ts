import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { KeywordMetric, Config } from '../types';

/**
 * Adapter class for interacting with Google Sheets.
 */
export class SheetAdapter {
  private doc: GoogleSpreadsheet;
  private auth: JWT;

  /**
   * Creates a new SheetAdapter instance.
   * @param config - Configuration containing Sheet ID and auth credentials.
   */
  constructor(config: Config) {
    this.auth = new JWT({
      email: config.SERVICE_ACCOUNT_EMAIL,
      key: config.PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.doc = new GoogleSpreadsheet(config.SHEET_ID, this.auth);
  }

  /**
   * Saves keyword metrics to the 'RawData' sheet.
   * @param metrics - Array of KeywordMetric objects to save.
   */
  async saveKeywords(metrics: KeywordMetric[]): Promise<void> {
    try {
      await this.doc.loadInfo();
      console.log(`Loaded document: ${this.doc.title}`);

      // Get the 'RawData' sheet or create it if it doesn't exist
      let sheet = this.doc.sheetsByTitle['RawData'];

      if (!sheet) {
        sheet = await this.doc.addSheet({
          title: 'RawData',
          headerValues: ['keyword', 'source', 'totalResults', 'allInTitleCount', 'timestamp'],
        });
        console.log('Created new "RawData" sheet');
      }

      // Prepare rows for insertion
      const rows = metrics.map((metric) => ({
        keyword: metric.keyword,
        source: metric.source,
        totalResults: metric.totalResults,
        allInTitleCount: metric.allInTitleCount,
        timestamp: new Date().toISOString(),
      }));

      // Append rows to the sheet
      await sheet.addRows(rows);
      console.log(`Successfully saved ${rows.length} keywords to the sheet`);
    } catch (error) {
      console.error('Error saving keywords to sheet:', error);
      throw error;
    }
  }
}
