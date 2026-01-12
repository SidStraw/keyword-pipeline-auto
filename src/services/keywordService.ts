import axios from 'axios';
import { KeywordMetric } from '../types';
import { config } from '../config';

/**
 * Delay utility function.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches keyword suggestions from Google Suggest API.
 * @param seed - The seed keyword to get suggestions for.
 * @returns Array of suggested keywords.
 */
export async function fetchSuggestions(seed: string): Promise<string[]> {
  try {
    const encodedSeed = encodeURIComponent(seed);
    const url = `https://www.google.com/complete/search?client=chrome&q=${encodedSeed}`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    // Google Suggest API returns: [query, suggestions, ...]
    const suggestions = response.data[1];

    if (Array.isArray(suggestions)) {
      return suggestions.filter((s): s is string => typeof s === 'string');
    }

    return [];
  } catch (error) {
    console.error(`Error fetching suggestions for "${seed}":`, error);
    return [];
  }
}

/**
 * Analyzes competition for a keyword using Serper.dev API.
 * Performs an "allintitle" search to check competition level.
 * @param keyword - The keyword to analyze.
 * @returns KeywordMetric with competition data.
 */
export async function analyzeCompetition(keyword: string): Promise<KeywordMetric> {
  try {
    // Add delay to avoid rate limits
    await delay(500);

    const response = await axios.post(
      'https://google.serper.dev/search',
      {
        q: `allintitle:${keyword}`,
      },
      {
        headers: {
          'X-API-KEY': config.SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const totalResults = response.data?.searchInformation?.totalResults ?? 0;

    return {
      keyword,
      source: 'google-suggest',
      totalResults: parseInt(String(totalResults), 10) || 0,
      allInTitleCount: parseInt(String(totalResults), 10) || 0,
    };
  } catch (error) {
    console.error(`Error analyzing competition for "${keyword}":`, error);
    return {
      keyword,
      source: 'google-suggest',
      totalResults: 0,
      allInTitleCount: 0,
    };
  }
}
