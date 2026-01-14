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
  ghToken: string;
  seedKeywords: string[];
  copilotModel: string;
  discordWebhookUrl: string | null;
}

/**
 * Discord Embed field structure.
 */
export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Discord Embed structure for rich messages.
 */
export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

/**
 * Discord Webhook payload structure.
 */
export interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

/**
 * Pipeline execution result for Discord notification.
 */
export interface PipelineResult {
  success: boolean;
  totalKeywords: number;
  metrics: KeywordMetric[];
  aiSummary: string | null;
  error?: string;
  startTime: Date;
  endTime: Date;
  /** Seeds used for this pipeline run */
  seeds: string[];
}
