import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { KeywordMetric } from '../types';

/**
 * AI Service for generating niche keyword ideas using Google Gemini API.
 */

/**
 * Generates niche keyword ideas using Google Gemini API.
 * @returns Array of generated keyword strings.
 * @throws Error if Gemini API call fails.
 */
export async function generateNicheIdeas(): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: config.geminiModel });

  const prompt =
    "Give me 5 unique, niche, micro-SaaS tool ideas or developer utility keywords (e.g., 'svg to jsx', 'json validator', 'pdf merger'). Return ONLY the keywords separated by commas.";

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
}

/**
 * Summarizes keyword discovery results and provides actionable insights.
 * @param metrics - Array of keyword metrics that were saved
 * @returns AI-generated summary and recommendations
 */
export async function summarizeKeywordResults(metrics: KeywordMetric[]): Promise<string> {
  if (metrics.length === 0) {
    return '📊 No keywords were found in this session. Try adjusting your seed keywords or competition threshold.';
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: config.geminiModel });

  // Prepare data for AI analysis
  const keywordList = metrics
    .map((m, index) => `${index + 1}. "${m.keyword}" - Competition: ${m.allInTitleCount}`)
    .join('\n');

  const stats = {
    total: metrics.length,
    avgCompetition: Math.round(
      metrics.reduce((sum, m) => sum + m.allInTitleCount, 0) / metrics.length
    ),
    lowestCompetition: Math.min(...metrics.map((m) => m.allInTitleCount)),
    highestCompetition: Math.max(...metrics.map((m) => m.allInTitleCount)),
  };

  const prompt = `你是一位 SEO 和內容策略專家。請分析以下關鍵字發現結果並提供實用建議。

## 統計數據
- 總共發現: ${stats.total} 個低競爭關鍵字
- 平均競爭度: ${stats.avgCompetition}
- 最低競爭度: ${stats.lowestCompetition}
- 最高競爭度: ${stats.highestCompetition}

## 關鍵字列表
${keywordList}

請提供：
1. **總體評估**：這批關鍵字的整體品質和機會分析（2-3句話）
2. **優先建議**：應該優先針對哪 3-5 個關鍵字創建內容，為什麼？
3. **內容策略**：針對這些關鍵字，建議的內容類型和方向
4. **下一步行動**：具體可執行的 3-5 個行動項目

請用繁體中文回答，保持專業且實用。使用 emoji 和 markdown 格式讓輸出更易讀。`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text();

    return summary;
  } catch (error) {
    console.error('❌ Error generating AI summary:', error);
    return `⚠️ 無法生成 AI 總結。發現了 ${metrics.length} 個關鍵字。`;
  }
}
