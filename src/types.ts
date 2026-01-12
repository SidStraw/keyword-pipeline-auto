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
  serperApiKey: string;
  gasWebAppUrl: string;
  myCustomApiKey: string;
  geminiApiKey: string;
  seedKeywords: string[];
  geminiModel: string;
}
