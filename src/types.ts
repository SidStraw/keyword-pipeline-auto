/**
 * Represents the metrics collected for a keyword.
 */
export interface KeywordMetric {
  keyword: string;
  source: string;
  totalResults: number;
  allInTitleCount: number;
}

/**
 * Configuration interface for environment variables.
 */
export interface Config {
  SERVICE_ACCOUNT_EMAIL: string;
  PRIVATE_KEY: string;
  SHEET_ID: string;
  SERPER_API_KEY: string;
}
