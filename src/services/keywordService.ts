import axios from 'axios';
import { KeywordMetric } from '../types';
import { config } from '../config';
import { isGoogleSearchConfigured, getCompetitionCount } from './googleSearchService';
import { getSearchVolume } from './trendsService';

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
 * Analyzes competition for a keyword using the best available API.
 * Prefers Google Custom Search API (if configured) for precise totalResults,
 * falls back to Serper.dev API.
 * @param keyword - The keyword to analyze.
 * @returns KeywordMetric with competition data.
 */
export async function analyzeCompetition(keyword: string): Promise<KeywordMetric> {
  // Try Google Custom Search API first (more accurate totalResults)
  if (isGoogleSearchConfigured()) {
    try {
      const competitionCount = await getCompetitionCount(keyword);
      
      return {
        keyword,
        source: 'google-custom-search',
        totalResults: competitionCount,
        allInTitleCount: competitionCount,
      };
    } catch (error) {
      console.warn(`⚠️ Google Custom Search failed for "${keyword}", falling back to Serper`);
      // Fall through to Serper API
    }
  }

  // Fallback to Serper API
  return analyzeCompetitionWithSerper(keyword);
}

/**
 * Analyzes competition using Serper.dev API.
 * @param keyword - The keyword to analyze.
 * @returns KeywordMetric with competition data.
 */
async function analyzeCompetitionWithSerper(keyword: string): Promise<KeywordMetric> {
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
          'X-API-KEY': config.serperApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    // Serper API 回應結構：
    // - organic: 搜尋結果陣列（最多 10 筆）
    // - 注意：Serper 不提供確切的 totalResults
    // - 競爭度策略：有機結果數量 <= 5 表示低競爭（好機會）
    
    const organicResults = response.data?.organic || [];
    const resultCount = organicResults.length;
    
    // 估算實際結果數：
    // - 如果返回 10 個結果，實際可能更多，估算為 100+
    // - 如果返回 < 10 個結果，使用實際數量
    const estimatedTotal = resultCount === 10 ? 100 : resultCount;

    return {
      keyword,
      source: 'serper-api',
      totalResults: estimatedTotal,
      allInTitleCount: estimatedTotal,
    };
  } catch (error: unknown) {
    const errorObj = error as { message?: string; response?: { status?: number; data?: unknown } };
    console.error(`❌ Error analyzing competition for "${keyword}":`, errorObj.message);
    if (errorObj.response) {
      console.error(`Status: ${errorObj.response.status}`);
      console.error(`Response:`, JSON.stringify(errorObj.response.data, null, 2));
    }
    return {
      keyword,
      source: 'serper-api',
      totalResults: 0,
      allInTitleCount: 0,
    };
  }
}

/**
 * Enhanced competition analysis with search volume estimation.
 * @param keyword - The keyword to analyze.
 * @returns KeywordMetric with competition and search volume data.
 */
export async function analyzeCompetitionWithVolume(keyword: string): Promise<KeywordMetric> {
  // Get basic competition data
  const metric = await analyzeCompetition(keyword);
  
  // Enhance with search volume from Google Trends
  try {
    const searchVolume = await getSearchVolume(keyword);
    metric.searchVolume = searchVolume;
  } catch (error) {
    console.warn(`⚠️ Could not get search volume for "${keyword}"`);
    metric.searchVolume = 100; // Default estimate
  }

  return metric;
}
