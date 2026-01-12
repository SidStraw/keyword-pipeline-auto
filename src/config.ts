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
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const seedKeywordsEnv = process.env.SEED_KEYWORDS;

  if (!serperApiKey) {
    throw new Error('Missing required environment variable: SERPER_API_KEY');
  }

  if (!gasWebAppUrl) {
    throw new Error('Missing required environment variable: GAS_WEB_APP_URL');
  }

  if (!myCustomApiKey) {
    throw new Error('Missing required environment variable: MY_CUSTOM_API_KEY');
  }

  if (!geminiApiKey) {
    throw new Error('Missing required environment variable: GEMINI_API_KEY');
  }

  // Parse optional SEED_KEYWORDS (comma-separated) or default to empty array
  const seedKeywords = seedKeywordsEnv
    ? seedKeywordsEnv.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
    : [];

  return {
    serperApiKey,
    gasWebAppUrl,
    myCustomApiKey,
    geminiApiKey,
    seedKeywords,
  };
}

export const config = loadConfig();
