import dotenv from 'dotenv';
import { Config } from './types';

// Load environment variables from .env file
dotenv.config();

/**
 * Loads and validates environment variables.
 */
function loadConfig(): Config {
  const serperApiKey = process.env.SERPER_API_KEY;
  const gasWebAppUrl = process.env.GAS_WEB_APP_URL;
  const myCustomApiKey = process.env.MY_CUSTOM_API_KEY;
  // GH_TOKEN or COPILOT_GITHUB_TOKEN for Copilot CLI authentication
  const ghToken = process.env.GH_TOKEN || process.env.COPILOT_GITHUB_TOKEN;
  const seedKeywordsEnv = process.env.SEED_KEYWORDS;
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || null;

  if (!serperApiKey) {
    throw new Error('Missing required environment variable: SERPER_API_KEY');
  }

  if (!gasWebAppUrl) {
    throw new Error('Missing required environment variable: GAS_WEB_APP_URL');
  }

  if (!myCustomApiKey) {
    throw new Error('Missing required environment variable: MY_CUSTOM_API_KEY');
  }

  if (!ghToken) {
    throw new Error('Missing required environment variable: GH_TOKEN (GitHub PAT with Copilot Requests permission)');
  }

  // Parse optional SEED_KEYWORDS (comma-separated) or default to empty array
  const seedKeywords = seedKeywordsEnv
    ? seedKeywordsEnv.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
    : [];

  return {
    serperApiKey,
    gasWebAppUrl,
    myCustomApiKey,
    ghToken,
    seedKeywords,
    copilotModel: process.env.COPILOT_MODEL || 'claude-haiku-4.5',
    discordWebhookUrl,
  };
}

export const config = loadConfig();
