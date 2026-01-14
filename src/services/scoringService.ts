import { KeywordMetric, ToolSuggestion } from '../types';

/**
 * Scoring Service
 * Calculates priority scores and ROI estimates for keywords
 * 
 * Priority Formula:
 * - Search Volume: 40%
 * - Competition (inverse): 30%
 * - Build Difficulty (inverse): 20%
 * - Relevance: 10%
 */

// Score weights - configurable for different strategies
const WEIGHTS = {
  searchVolume: 0.40,    // Higher search volume = more traffic potential
  competition: 0.30,     // Lower competition = easier to rank
  buildDifficulty: 0.20, // Lower difficulty = faster to market
  relevance: 0.10,       // Higher relevance = better product-market fit
};

// Normalization constants based on typical ranges for tool keywords
// These thresholds are calibrated for niche developer/utility tools
const NORMALIZATION = {
  // 10k monthly searches is considered high for niche tools
  // Most successful free tools see 1k-5k searches/month
  maxSearchVolume: 10000,
  // 1000 allintitle results indicates high competition
  // <50 is ideal, 50-200 is moderate, >500 is competitive
  maxCompetition: 1000,
  // AI assessment scale 1-10 where 1=trivial, 10=complex enterprise tool
  maxBuildDifficulty: 10,
  // AI assessment scale 1-10 where 10=perfectly aligned with tool builder use case
  maxRelevance: 10,
};

/**
 * Normalize a value to 0-100 scale
 */
function normalize(value: number, max: number, inverse: boolean = false): number {
  const normalized = Math.min(value / max, 1) * 100;
  return inverse ? 100 - normalized : normalized;
}

/**
 * Calculate priority score for a keyword metric
 * Higher score = better opportunity
 * @param metric - Keyword metric with all fields
 * @returns Priority score (0-100)
 */
export function calculatePriorityScore(metric: KeywordMetric): number {
  const searchVolumeScore = normalize(
    metric.searchVolume || 100,
    NORMALIZATION.maxSearchVolume
  );
  
  const competitionScore = normalize(
    metric.allInTitleCount,
    NORMALIZATION.maxCompetition,
    true // Lower competition is better
  );
  
  const buildDifficultyScore = normalize(
    metric.buildDifficulty || 5,
    NORMALIZATION.maxBuildDifficulty,
    true // Lower difficulty is better
  );
  
  const relevanceScore = normalize(
    metric.relevance || 5,
    NORMALIZATION.maxRelevance
  );

  const priorityScore =
    searchVolumeScore * WEIGHTS.searchVolume +
    competitionScore * WEIGHTS.competition +
    buildDifficultyScore * WEIGHTS.buildDifficulty +
    relevanceScore * WEIGHTS.relevance;

  return Math.round(priorityScore * 10) / 10;
}

/**
 * Calculate ROI score based on potential value vs effort
 * Higher = better return on investment
 */
export function calculateROIScore(metric: KeywordMetric): number {
  const searchVolume = metric.searchVolume || 100;
  const competition = Math.max(metric.allInTitleCount, 1);
  const buildDifficulty = metric.buildDifficulty || 5;
  const devTime = metric.estimatedDevTime || 16;

  // ROI = (potential traffic * conversion factor) / effort
  // Potential traffic based on search volume and competition
  const potentialTraffic = searchVolume / Math.sqrt(competition);
  
  // Effort based on dev time and difficulty
  const effort = devTime * (buildDifficulty / 5);
  
  // ROI normalized to 0-100 scale
  const roi = Math.min((potentialTraffic / effort) * 10, 100);
  
  return Math.round(roi * 10) / 10;
}

/**
 * Estimate development time based on keyword complexity
 * @param keyword - The keyword/tool concept
 * @param buildDifficulty - AI-estimated build difficulty (1-10)
 * @returns Estimated hours to build MVP
 */
export function estimateDevTime(keyword: string, buildDifficulty: number): number {
  // Base time based on difficulty level
  const baseHours: Record<number, number> = {
    1: 2,   // Very simple (e.g., unit converter)
    2: 4,   // Simple utility
    3: 8,   // Basic tool
    4: 12,  // Standard tool
    5: 16,  // Medium complexity
    6: 24,  // Complex tool
    7: 32,  // Advanced tool
    8: 48,  // Very complex
    9: 64,  // Enterprise-level
    10: 80, // Major project
  };

  // Get base hours, default to 16 for medium
  const base = baseHours[Math.round(buildDifficulty)] || 16;

  // Adjust based on keyword complexity indicators
  const complexityIndicators = [
    'api',
    'integration',
    'real-time',
    'ai',
    'ml',
    'database',
    'authentication',
    'multi',
  ];

  const keywordLower = keyword.toLowerCase();
  const complexityBonus = complexityIndicators.reduce(
    (bonus, indicator) => bonus + (keywordLower.includes(indicator) ? 4 : 0),
    0
  );

  return Math.min(base + complexityBonus, 120);
}

/**
 * Score and rank all metrics, returning top suggestions
 * @param metrics - Array of keyword metrics
 * @param topN - Number of top suggestions to return
 * @returns Ranked and scored metrics
 */
export function rankMetrics(
  metrics: KeywordMetric[],
  topN: number = 3
): KeywordMetric[] {
  // Calculate scores for each metric
  const scoredMetrics = metrics.map((metric) => ({
    ...metric,
    priorityScore: calculatePriorityScore(metric),
    roiScore: calculateROIScore(metric),
    estimatedDevTime: estimateDevTime(
      metric.keyword,
      metric.buildDifficulty || 5
    ),
  }));

  // Sort by priority score (descending)
  scoredMetrics.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  return scoredMetrics.slice(0, topN);
}

/**
 * Get weighted score breakdown for a metric (useful for debugging/display)
 */
export function getScoreBreakdown(metric: KeywordMetric): {
  searchVolumeContribution: number;
  competitionContribution: number;
  buildDifficultyContribution: number;
  relevanceContribution: number;
  total: number;
} {
  const searchVolumeScore = normalize(
    metric.searchVolume || 100,
    NORMALIZATION.maxSearchVolume
  );
  const competitionScore = normalize(
    metric.allInTitleCount,
    NORMALIZATION.maxCompetition,
    true
  );
  const buildDifficultyScore = normalize(
    metric.buildDifficulty || 5,
    NORMALIZATION.maxBuildDifficulty,
    true
  );
  const relevanceScore = normalize(metric.relevance || 5, NORMALIZATION.maxRelevance);

  return {
    searchVolumeContribution: Math.round(searchVolumeScore * WEIGHTS.searchVolume * 10) / 10,
    competitionContribution: Math.round(competitionScore * WEIGHTS.competition * 10) / 10,
    buildDifficultyContribution: Math.round(buildDifficultyScore * WEIGHTS.buildDifficulty * 10) / 10,
    relevanceContribution: Math.round(relevanceScore * WEIGHTS.relevance * 10) / 10,
    total: calculatePriorityScore(metric),
  };
}
