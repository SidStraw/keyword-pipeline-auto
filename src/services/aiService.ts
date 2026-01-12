import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { KeywordMetric } from '../types';

/**
 * AI Service for generating niche keyword ideas using Google Gemini API.
 */

/**
 * Delay utility for retry logic
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates niche keyword ideas using Google Gemini API.
 * Includes retry logic for handling API errors (503, rate limits, etc.)
 * @returns Array of generated keyword strings.
 * @throws Error if all retry attempts fail.
 */
export async function generateNicheIdeas(): Promise<string[]> {
  // Add initial delay to avoid immediate rate limiting
  console.log('⏳ Waiting 2 seconds before AI request to avoid rate limits...');
  await delay(2000);

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: config.geminiModel });

  const prompt =
    "Give me 5 unique, niche, micro-SaaS tool ideas or developer utility keywords (e.g., 'svg to jsx', 'json validator', 'pdf merger'). Return ONLY the keywords separated by commas.";

  // Retry configuration
  const maxRetries = 3;
  const baseDelay = 5000; // Increased to 5 seconds for better reliability

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 Generating niche ideas (attempt ${attempt}/${maxRetries})...`);
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse comma-separated keywords from response
      // Also handle newlines and numbered list formats
      const keywords = text
        .replace(/\n/g, ',')
        .replace(/^\d+\.\s*/gm, '')
        .split(',')
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length > 0 && keyword.length < 100);

      if (keywords.length === 0) {
        throw new Error('Gemini returned no valid keywords');
      }

      console.log(`🤖 Gemini generated ${keywords.length} keyword ideas`);
      return keywords;

    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error?.message || error?.toString() || 'Unknown error';

      console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, errorMessage);

      // Check if it's a retryable error
      const isRetryable =
        error?.status === 503 || // Service Unavailable
        error?.status === 429 || // Too Many Requests
        errorMessage.includes('overloaded') ||
        errorMessage.includes('rate limit');

      if (isRetryable && !isLastAttempt) {
        const waitTime = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Waiting ${waitTime / 1000}s before retry...`);
        await delay(waitTime);
        continue;
      }

      // If last attempt or non-retryable error, throw
      if (isLastAttempt) {
        console.error('❌ All retry attempts failed for generateNicheIdeas');
        throw error;
      }
    }
  }

  // Should not reach here, but just in case
  throw new Error('Failed to generate niche ideas after all retries');
}

/**
 * Summarizes keyword discovery results and provides actionable insights.
 * Includes retry logic for handling API errors (503, rate limits, etc.)
 * @param metrics - Array of keyword metrics that were saved
 * @returns AI-generated summary and recommendations
 */
export async function summarizeKeywordResults(metrics: KeywordMetric[]): Promise<string> {
  if (metrics.length === 0) {
    return '📊 這次沒有找到任何關鍵字。請嘗試調整種子關鍵字或競爭度閾值。';
  }

  // Add delay before AI request to avoid rate limiting
  console.log('⏳ Waiting 5 seconds before AI summary to avoid rate limits...');
  await delay(5000);

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: config.geminiModel });

  // Prepare data for AI analysis
  // Limit to first 10 keywords to reduce prompt size
  const limitedMetrics = metrics.slice(0, 10);
  const keywordList = limitedMetrics
    .map((m, index) => `${index + 1}. "${m.keyword}" (競爭度: ${m.allInTitleCount})`)
    .join('\n');

  const stats = {
    total: metrics.length,
    avgCompetition: Math.round(
      metrics.reduce((sum, m) => sum + m.allInTitleCount, 0) / metrics.length
    ),
    lowestCompetition: Math.min(...metrics.map((m) => m.allInTitleCount)),
    highestCompetition: Math.max(...metrics.map((m) => m.allInTitleCount)),
  };

  // Simplified prompt to reduce token usage
  const prompt = `你是 SEO 專家。用繁體中文分析這些關鍵字：

總數: ${stats.total} | 平均競爭度: ${stats.avgCompetition} | 最低: ${stats.lowestCompetition} | 最高: ${stats.highestCompetition}

關鍵字${limitedMetrics.length < metrics.length ? `（顯示前 ${limitedMetrics.length} 個）` : ''}：
${keywordList}

請提供：
1. 總體評估（2句話）
2. 優先建議（列出前3個關鍵字及原因）
3. 內容策略（建議的內容類型）
4. 下一步行動（3個具體行動）

用繁體中文、emoji、markdown格式回答。`;

  // Retry configuration
  const maxRetries = 3;
  const baseDelay = 5000; // Increased to 5 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 Generating AI summary (attempt ${attempt}/${maxRetries})...`);
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const summary = response.text();

      // Verify response is in Traditional Chinese
      if (summary && summary.length > 50) {
        console.log('✅ AI summary generated successfully');
        return summary;
      } else {
        throw new Error('AI response too short or empty');
      }

    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, errorMessage);

      // Check if it's a retryable error
      const isRetryable = 
        error?.status === 503 || // Service Unavailable
        error?.status === 429 || // Too Many Requests
        errorMessage.includes('overloaded') ||
        errorMessage.includes('rate limit');

      if (isRetryable && !isLastAttempt) {
        const waitTime = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Waiting ${waitTime / 1000}s before retry...`);
        await delay(waitTime);
        continue;
      }

      // If last attempt or non-retryable error, return fallback message
      if (isLastAttempt) {
        console.error('❌ All retry attempts failed');
        return generateFallbackSummary(metrics, stats);
      }
    }
  }

  // Fallback (should not reach here, but just in case)
  return generateFallbackSummary(metrics, stats);
}

/**
 * Generate a fallback summary when AI is unavailable
 */
function generateFallbackSummary(metrics: KeywordMetric[], stats: any): string {
  const topKeywords = metrics
    .sort((a, b) => a.allInTitleCount - b.allInTitleCount)
    .slice(0, 5)
    .map((m, i) => `${i + 1}. "${m.keyword}" (競爭度: ${m.allInTitleCount})`)
    .join('\n');

  return `## 📊 關鍵字發現摘要

⚠️ AI 總結服務暫時無法使用，以下是基本分析：

### 統計數據
- 總共發現：${stats.total} 個低競爭關鍵字
- 平均競爭度：${stats.avgCompetition}
- 競爭度範圍：${stats.lowestCompetition} - ${stats.highestCompetition}

### 優先推薦關鍵字（按競爭度排序）
${topKeywords}

### 建議
1. ✅ 優先針對競爭度最低的關鍵字創建內容
2. 📝 研究每個關鍵字的搜尋意圖和相關主題
3. 🎯 制定內容日曆，系統性地覆蓋這些關鍵字
4. 📊 追蹤每個關鍵字的排名和流量表現
5. 🔄 定期更新和優化已發布的內容

💡 提示：稍後可以重新執行以獲取完整的 AI 分析建議。`;
}
