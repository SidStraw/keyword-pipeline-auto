import { execSync } from 'child_process';
import { config } from '../config';
import { KeywordMetric } from '../types';

/**
 * AI Service for generating niche keyword ideas using GitHub Copilot CLI.
 * Uses `copilot -p` (prompt mode) for non-interactive AI generation.
 */

/**
 * Delay utility for retry logic
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute Copilot CLI in prompt mode with retry logic.
 * @param prompt - The prompt to send to Copilot
 * @returns The AI-generated response
 */
async function executeCopilotPrompt(prompt: string): Promise<string> {
  const maxRetries = 3;
  const baseDelay = 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 Calling Copilot CLI (attempt ${attempt}/${maxRetries})...`);

      // Use copilot -p for non-interactive prompt mode
      // --silent suppresses stats output
      // --model specifies the model to use
      const result = execSync(
        `copilot -p "${prompt.replace(/"/g, '\\"')}" --silent --model ${config.copilotModel}`,
        {
          encoding: 'utf-8',
          env: {
            ...process.env,
            GH_TOKEN: config.ghToken,
            COPILOT_GITHUB_TOKEN: config.ghToken,
          },
          timeout: 120000, // 2 minute timeout
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      if (result && result.trim().length > 0) {
        console.log('✅ Copilot CLI response received');
        return result.trim();
      }

      throw new Error('Copilot CLI returned empty response');

    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error?.message || error?.toString() || 'Unknown error';

      console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, errorMessage);

      // Check if it's a retryable error
      const isRetryable =
        errorMessage.includes('timeout') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('overloaded') ||
        error?.status === 429 ||
        error?.status === 503;

      if (isRetryable && !isLastAttempt) {
        const waitTime = baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${waitTime / 1000}s before retry...`);
        await delay(waitTime);
        continue;
      }

      if (isLastAttempt) {
        console.error('❌ All retry attempts failed for Copilot CLI');
        throw error;
      }
    }
  }

  throw new Error('Failed to get Copilot CLI response after all retries');
}

/**
 * Generates niche keyword ideas using GitHub Copilot CLI.
 * @returns Array of generated keyword strings.
 * @throws Error if all retry attempts fail.
 */
export async function generateNicheIdeas(): Promise<string[]> {
  console.log(`🤖 Using Copilot CLI with model: ${config.copilotModel}`);

  const prompt = `Give me 5 unique, niche, micro-SaaS tool ideas or developer utility keywords (e.g., 'svg to jsx', 'json validator', 'pdf merger'). Return ONLY the keywords separated by commas, nothing else.`;

  const response = await executeCopilotPrompt(prompt);

  // Parse comma-separated keywords from response
  // Also handle newlines and numbered list formats
  const keywords = response
    .replace(/\n/g, ',')
    .replace(/^\d+\.\s*/gm, '')
    .replace(/^[-•]\s*/gm, '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0 && keyword.length < 100);

  if (keywords.length === 0) {
    throw new Error('Copilot CLI returned no valid keywords');
  }

  console.log(`🤖 Copilot generated ${keywords.length} keyword ideas`);
  return keywords;
}

/**
 * Summarizes keyword discovery results and provides actionable insights.
 * Uses GitHub Copilot CLI for AI-powered analysis.
 * @param metrics - Array of keyword metrics that were saved
 * @returns AI-generated summary and recommendations
 */
export async function summarizeKeywordResults(metrics: KeywordMetric[]): Promise<string> {
  if (metrics.length === 0) {
    return '📊 這次沒有找到任何關鍵字。請嘗試調整種子關鍵字或競爭度閾值。';
  }

  console.log(`🤖 Using Copilot CLI with model: ${config.copilotModel}`);

  // Prepare data for AI analysis
  // Limit to first 10 keywords to reduce prompt size
  const limitedMetrics = metrics.slice(0, 10);
  const keywordList = limitedMetrics
    .map((m, index) => `${index + 1}. "${m.keyword}" (競爭度: ${m.allInTitleCount})`)
    .join('\\n');

  const stats = {
    total: metrics.length,
    avgCompetition: Math.round(
      metrics.reduce((sum, m) => sum + m.allInTitleCount, 0) / metrics.length
    ),
    lowestCompetition: Math.min(...metrics.map((m) => m.allInTitleCount)),
    highestCompetition: Math.max(...metrics.map((m) => m.allInTitleCount)),
  };

  const prompt = `你是 SEO 專家。用繁體中文分析這些關鍵字：總數: ${stats.total} | 平均競爭度: ${stats.avgCompetition} | 最低: ${stats.lowestCompetition} | 最高: ${stats.highestCompetition}。關鍵字${limitedMetrics.length < metrics.length ? `（顯示前 ${limitedMetrics.length} 個）` : ''}：${keywordList}。請提供：1. 總體評估（2句話）2. 優先建議（列出前3個關鍵字及原因）3. 內容策略（建議的內容類型）4. 下一步行動（3個具體行動）。用繁體中文、emoji、markdown格式回答。`;

  try {
    const summary = await executeCopilotPrompt(prompt);

    // Verify response is valid
    if (summary && summary.length > 50) {
      console.log('✅ AI summary generated successfully');
      return summary;
    } else {
      throw new Error('AI response too short or empty');
    }
  } catch (error: any) {
    console.error('❌ Failed to generate AI summary:', error?.message);
    return generateFallbackSummary(metrics, stats);
  }
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
