import axios from 'axios';
import { config } from '../config';

/**
 * Google Custom Search API Service
 * Provides precise totalResults for competition analysis
 * Free tier: 100 queries/day
 */

interface GoogleSearchResult {
  totalResults: number;
  itemCount: number;
}

/**
 * Delay utility for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if Google Custom Search API is configured
 */
export function isGoogleSearchConfigured(): boolean {
  return !!(config.googleApiKey && config.googleCseId);
}

/**
 * Performs a Google Custom Search API query with allintitle operator
 * Returns precise totalResults count for competition analysis
 * @param keyword - The keyword to search for
 * @returns Search result with totalResults count
 */
export async function searchAllInTitle(keyword: string): Promise<GoogleSearchResult> {
  if (!config.googleApiKey || !config.googleCseId) {
    throw new Error('Google Custom Search API not configured. Set GOOGLE_API_KEY and GOOGLE_CSE_ID.');
  }

  try {
    // Rate limiting to stay within free tier
    await delay(200);

    const query = `allintitle:${keyword}`;
    const url = 'https://www.googleapis.com/customsearch/v1';

    const response = await axios.get(url, {
      params: {
        key: config.googleApiKey,
        cx: config.googleCseId,
        q: query,
        num: 1, // Only need count, minimize data transfer
      },
      timeout: 10000,
    });

    // Extract totalResults from the response
    // API returns totalResults as a string
    const totalResults = parseInt(
      response.data?.queries?.request?.[0]?.totalResults || '0',
      10
    );
    const itemCount = response.data?.items?.length || 0;

    return {
      totalResults,
      itemCount,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;

      // Handle quota exceeded
      if (status === 429 || message?.includes('quota')) {
        console.warn('⚠️ Google Custom Search API quota exceeded for today');
        throw new Error('Google Search API quota exceeded');
      }

      console.error(`❌ Google Search API error: ${status} - ${message}`);
    } else {
      console.error('❌ Google Search API error:', error);
    }

    return { totalResults: 0, itemCount: 0 };
  }
}

/**
 * Get total results count for a keyword using Google Custom Search
 * @param keyword - The keyword to analyze
 * @returns Total results count (allintitle)
 */
export async function getCompetitionCount(keyword: string): Promise<number> {
  const result = await searchAllInTitle(keyword);
  return result.totalResults;
}
