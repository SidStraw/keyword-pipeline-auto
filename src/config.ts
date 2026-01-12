import dotenv from 'dotenv';
import { Config } from './types';

// Load environment variables from .env file
dotenv.config();

/**
 * Loads and validates environment variables.
 * Handles PRIVATE_KEY newline replacement for GitHub Secrets compatibility.
 */
function loadConfig(): Config {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const serperApiKey = process.env.SERPER_API_KEY;

  if (!serviceAccountEmail) {
    throw new Error('Missing required environment variable: GOOGLE_SERVICE_ACCOUNT_EMAIL');
  }

  if (!privateKey) {
    throw new Error('Missing required environment variable: GOOGLE_PRIVATE_KEY');
  }

  if (!sheetId) {
    throw new Error('Missing required environment variable: GOOGLE_SHEET_ID');
  }

  if (!serperApiKey) {
    throw new Error('Missing required environment variable: SERPER_API_KEY');
  }

  // Handle newline replacement for PRIVATE_KEY from GitHub Secrets
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  return {
    SERVICE_ACCOUNT_EMAIL: serviceAccountEmail,
    PRIVATE_KEY: formattedPrivateKey,
    SHEET_ID: sheetId,
    SERPER_API_KEY: serperApiKey,
  };
}

export const config = loadConfig();
