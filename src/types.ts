/**
 * Represents the metrics collected for a keyword.
 */
export interface KeywordMetric {
  keyword: string;
  source: string;
  totalResults: number;
  allInTitleCount: number;
  /** Estimated search volume (from Google Trends) */
  searchVolume?: number;
  /** Build difficulty score (1-10, AI estimated) */
  buildDifficulty?: number;
  /** Product relevance score (1-10, AI estimated) */
  relevance?: number;
  /** Priority score calculated from formula */
  priorityScore?: number;
  /** Estimated development time in hours */
  estimatedDevTime?: number;
  /** ROI score (potential value / effort) */
  roiScore?: number;
}

/**
 * AI-generated tool suggestion with actionable details.
 */
export interface ToolSuggestion {
  keyword: string;
  toolName: string;
  concept: string;
  techStack: string[];
  ctaSuggestion: string;
  oneLiner: string;
  priorityScore: number;
  estimatedDevTime: number;
  roiScore: number;
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
  /** Google Custom Search API key (optional, for precise totalResults) */
  googleApiKey: string | null;
  /** Google Custom Search Engine ID (optional) */
  googleCseId: string | null;
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
  /** Top tool suggestions with actionable details */
  topSuggestions?: ToolSuggestion[];
}
