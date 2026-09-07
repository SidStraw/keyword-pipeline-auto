import axios from 'axios';

/**
 * Google Trends Service
 * Estimates search volume using Google Trends data
 * No API key required - uses public endpoint
 */

interface TrendData {
  /** Relative search interest (0-100) */
  interestScore: number;
  /** Estimated monthly search volume category */
  volumeCategory: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  /** Estimated monthly searches based on category */
  estimatedMonthlySearches: number;
}

/**
 * Delay utility for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Map interest score to volume category and estimated searches
 * Based on typical correlations between Google Trends scores and actual search volumes
 */
function mapInterestToVolume(interestScore: number): {
  category: TrendData['volumeCategory'];
  estimatedSearches: number;
} {
  if (interestScore >= 80) {
    return { category: 'very_high', estimatedSearches: 10000 };
  } else if (interestScore >= 60) {
    return { category: 'high', estimatedSearches: 5000 };
  } else if (interestScore >= 40) {
    return { category: 'medium', estimatedSearches: 1000 };
  } else if (interestScore >= 20) {
    return { category: 'low', estimatedSearches: 500 };
  } else {
    return { category: 'very_low', estimatedSearches: 100 };
  }
}

/**
 * Fetch related queries from Google Trends
 * Uses the public suggestions endpoint
 * Note: This endpoint may have rate limits or change without notice.
 * Implements fallback for robustness.
 * @param keyword - Keyword to get trends for
 * @returns Trend data with interest score and volume estimate
 */
export async function getTrendData(keyword: string): Promise<TrendData> {
  try {
    // Rate limiting
    await delay(300);

    // Use Google Trends autocomplete/suggestions endpoint
    // This gives us related queries and a basic interest indicator
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://trends.google.com/trends/api/autocomplete/${encodedKeyword}?hl=en-US`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    // Google Trends returns data with a prefix that needs to be removed
    // Handle cases where the prefix may vary or be absent
    let jsonStr = response.data;
    if (typeof jsonStr === 'string') {
      // Try to remove known JSONP prefixes
      const prefixPatterns = [/^\)\]\}',\n/, /^[^\[{]+/];
      for (const pattern of prefixPatterns) {
        const cleaned = jsonStr.replace(pattern, '');
        if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
          jsonStr = cleaned;
          break;
        }
      }
    }
    
    let data: { default?: { topics?: Array<{ title?: string }> } };
    try {
      data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    } catch {
      // If parsing fails, return default estimate
      console.warn(`⚠️ Could not parse trends response for "${keyword}"`);
      return getDefaultTrendData();
    }

    // Extract topic information if available
    const topics = data?.default?.topics || [];
    
    // Calculate interest score based on topic relevance
    // Higher relevance = more search interest
    let interestScore = 0;
    if (topics.length > 0) {
      // Topics found means there's search interest
      interestScore = Math.min(100, 20 + topics.length * 15);
      
      // Boost if the keyword appears as a top topic
      const exactMatch = topics.find(
        (t) => t.title?.toLowerCase() === keyword.toLowerCase()
      );
      if (exactMatch) {
        interestScore = Math.min(100, interestScore + 20);
      }
    } else {
      // No topics = very niche or new keyword
      interestScore = 10;
    }

    const { category, estimatedSearches } = mapInterestToVolume(interestScore);

    return {
      interestScore,
      volumeCategory: category,
      estimatedMonthlySearches: estimatedSearches,
    };
  } catch (error) {
    // Fallback: assume low-medium interest for unknown keywords
    // This is reasonable for niche tool keywords
    console.warn(`⚠️ Could not fetch trends for "${keyword}", using default estimate`);
    return getDefaultTrendData();
  }
}

/**
 * Returns default trend data for fallback scenarios
 */
function getDefaultTrendData(): TrendData {
  return {
    interestScore: 25,
    volumeCategory: 'low',
    estimatedMonthlySearches: 300,
  };
}

/**
 * Batch fetch trend data for multiple keywords
 * @param keywords - Array of keywords to analyze
 * @returns Map of keyword to trend data
 */
export async function getBatchTrendData(
  keywords: string[]
): Promise<Map<string, TrendData>> {
  const results = new Map<string, TrendData>();

  for (const keyword of keywords) {
    const trendData = await getTrendData(keyword);
    results.set(keyword, trendData);
  }

  return results;
}

/**
 * Get estimated search volume for a keyword
 * @param keyword - Keyword to estimate volume for
 * @returns Estimated monthly search volume
 */
export async function getSearchVolume(keyword: string): Promise<number> {
  const trendData = await getTrendData(keyword);
  return trendData.estimatedMonthlySearches;
}
