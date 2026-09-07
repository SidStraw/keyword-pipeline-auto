import { execSync } from 'child_process';
import { config } from '../config';
import { KeywordMetric, ToolSuggestion } from '../types';

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

    } catch (error: unknown) {
      const isLastAttempt = attempt === maxRetries;
      const errorObj = error as { message?: string; status?: number };
      const errorMessage = errorObj?.message || String(error) || 'Unknown error';

      console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, errorMessage);

      // Check if it's a retryable error
      const isRetryable =
        errorMessage.includes('timeout') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('overloaded') ||
        errorObj?.status === 429 ||
        errorObj?.status === 503;

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
 * Enhanced to produce more keywords (15-20) for tool discovery.
 * @param count - Number of keywords to generate (default: 15)
 * @returns Array of generated keyword strings.
 * @throws Error if all retry attempts fail.
 */
export async function generateNicheIdeas(count: number = 15): Promise<string[]> {
  console.log(`🤖 Using Copilot CLI with model: ${config.copilotModel}`);

  const prompt = `Generate ${count} unique, niche, micro-SaaS tool ideas or developer utility keywords. Focus on:
1. Simple web tools (converters, validators, formatters)
2. Developer utilities (code tools, API helpers)
3. Content tools (generators, editors)
4. Productivity tools (calculators, planners)

Examples: 'svg to jsx', 'json validator', 'pdf merger', 'color palette generator', 'regex tester'

Return ONLY the keywords separated by commas, nothing else. No explanations.`;

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
 * AI-powered build difficulty and relevance assessment
 * @param keywords - Array of keywords to assess
 * @returns Map of keyword to assessment scores
 */
export async function assessKeywordDifficulty(
  keywords: string[]
): Promise<Map<string, { buildDifficulty: number; relevance: number }>> {
  console.log(`🤖 Assessing build difficulty for ${keywords.length} keywords...`);

  const results = new Map<string, { buildDifficulty: number; relevance: number }>();

  // Process in batches of 5 to reduce API calls
  const batchSize = 5;
  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    const keywordList = batch.map((k, idx) => `${idx + 1}. ${k}`).join(', ');

    const prompt = `Rate these tool keywords for a developer building free web tools.

Keywords: ${keywordList}

For each keyword, rate (1-10):
- Build Difficulty: 1=very easy (simple converter), 10=very hard (complex AI tool)
- Relevance: 1=low value, 10=high demand/useful

Return ONLY in format: keyword1:difficulty,relevance|keyword2:difficulty,relevance
Example: svg to jsx:3,8|json validator:2,9

No explanations, just the ratings.`;

    try {
      const response = await executeCopilotPrompt(prompt);
      
      // Validate response format before parsing
      // Expected format: "keyword1:difficulty,relevance|keyword2:difficulty,relevance"
      if (!response || typeof response !== 'string') {
        console.warn('⚠️ Invalid AI response format, using defaults');
        for (const keyword of batch) {
          results.set(keyword, { buildDifficulty: 5, relevance: 5 });
        }
        continue;
      }
      
      // Parse response: "keyword1:3,8|keyword2:2,9"
      const pairs = response.split('|');
      let parsedCount = 0;
      
      for (const pair of pairs) {
        // More flexible regex to handle various AI response formats
        const match = pair.match(/(.+?)\s*:\s*(\d+)\s*,\s*(\d+)/);
        if (match) {
          const keyword = match[1].trim().toLowerCase();
          const difficultyRaw = parseInt(match[2], 10);
          const relevanceRaw = parseInt(match[3], 10);
          
          // Validate parsed numbers
          if (isNaN(difficultyRaw) || isNaN(relevanceRaw)) {
            continue;
          }
          
          const difficulty = Math.min(10, Math.max(1, difficultyRaw));
          const relevance = Math.min(10, Math.max(1, relevanceRaw));
          
          // Find the original keyword (case-insensitive match)
          const originalKeyword = batch.find(
            (k) => k.toLowerCase() === keyword || keyword.includes(k.toLowerCase())
          );
          if (originalKeyword) {
            results.set(originalKeyword, { buildDifficulty: difficulty, relevance });
            parsedCount++;
          }
        }
      }
      
      // If parsing failed for most keywords, use defaults for the rest
      if (parsedCount < batch.length / 2) {
        console.warn(`⚠️ Only parsed ${parsedCount}/${batch.length} keywords, using defaults for rest`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not assess batch, using defaults`);
      // Use defaults for failed assessments
      for (const keyword of batch) {
        results.set(keyword, { buildDifficulty: 5, relevance: 5 });
      }
    }
  }

  // Ensure all keywords have values
  for (const keyword of keywords) {
    if (!results.has(keyword)) {
      results.set(keyword, { buildDifficulty: 5, relevance: 5 });
    }
  }

  return results;
}

/**
 * Generate detailed tool suggestions with actionable information
 * @param metrics - Top keyword metrics to expand
 * @returns Array of detailed tool suggestions
 */
export async function generateToolSuggestions(
  metrics: KeywordMetric[]
): Promise<ToolSuggestion[]> {
  console.log(`🤖 Generating detailed tool suggestions for top ${metrics.length} keywords...`);

  const suggestions: ToolSuggestion[] = [];

  for (const metric of metrics) {
    const prompt = `你是一個工具產品經理。針對關鍵字「${metric.keyword}」設計一個免費網頁工具。

用繁體中文回答，格式必須嚴格如下（每行一項）：
工具名稱: [創意名稱]
概念: [一句話描述工具功能]
技術棧: [前端框架,必要的API或庫]
CTA: [吸引用戶的行動呼籲]
一句話: [SEO友好的工具描述]
市場缺口: [分析現有競品缺少什麼功能，你的MVP應該主打什麼差異化功能，100字以內]

只回答上述格式，不要額外說明。`;

    try {
      const response = await executeCopilotPrompt(prompt);
      
      // Parse structured response
      const lines = response.split('\n');
      const getValue = (prefix: string): string => {
        const line = lines.find((l) => l.startsWith(prefix));
        return line ? line.replace(prefix, '').trim() : '';
      };

      const toolName = getValue('工具名稱:') || getValue('工具名稱：') || metric.keyword;
      const concept = getValue('概念:') || getValue('概念：') || '';
      const techStackStr = getValue('技術棧:') || getValue('技術棧：') || 'React, TypeScript';
      const ctaSuggestion = getValue('CTA:') || getValue('CTA：') || '立即使用';
      const oneLiner = getValue('一句話:') || getValue('一句話：') || '';
      const marketGap = getValue('市場缺口:') || getValue('市場缺口：') || '待分析';

      const techStack = techStackStr
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      suggestions.push({
        keyword: metric.keyword,
        toolName,
        concept,
        techStack,
        ctaSuggestion,
        oneLiner,
        priorityScore: metric.priorityScore || 0,
        estimatedDevTime: metric.estimatedDevTime || 16,
        roiScore: metric.roiScore || 0,
        marketGap,
      });
    } catch (error) {
      // Add basic suggestion on failure
      suggestions.push({
        keyword: metric.keyword,
        toolName: metric.keyword,
        concept: `${metric.keyword} 工具`,
        techStack: ['React', 'TypeScript'],
        ctaSuggestion: '免費使用',
        oneLiner: `簡單易用的 ${metric.keyword} 工具`,
        priorityScore: metric.priorityScore || 0,
        estimatedDevTime: metric.estimatedDevTime || 16,
        roiScore: metric.roiScore || 0,
        marketGap: '待分析',
      });
    }
  }

  return suggestions;
}

/**
 * Enhanced summary with Top 3 priorities, ROI scores, and dev time estimates
 * @param metrics - All keyword metrics
 * @param topSuggestions - Detailed tool suggestions for top keywords
 * @returns Formatted AI summary
 */
export async function summarizeKeywordResults(
  metrics: KeywordMetric[],
  topSuggestions?: ToolSuggestion[]
): Promise<string> {
  if (metrics.length === 0) {
    return '📊 這次沒有找到任何關鍵字。請嘗試調整種子關鍵字或競爭度閾值。';
  }

  console.log(`🤖 Using Copilot CLI with model: ${config.copilotModel}`);

  // Sort by priority score
  const sortedMetrics = [...metrics].sort(
    (a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)
  );

  // Prepare data for AI analysis
  const top10 = sortedMetrics.slice(0, 10);
  const keywordList = top10
    .map((m, index) => {
      const parts = [
        `${index + 1}. "${m.keyword}"`,
        `競爭:${m.allInTitleCount}`,
        m.searchVolume ? `搜尋量:${m.searchVolume}` : '',
        m.priorityScore ? `優先分:${m.priorityScore}` : '',
        m.buildDifficulty ? `難度:${m.buildDifficulty}` : '',
      ].filter(Boolean);
      return parts.join(' | ');
    })
    .join('\\n');

  const stats = {
    total: metrics.length,
    avgCompetition: Math.round(
      metrics.reduce((sum, m) => sum + m.allInTitleCount, 0) / metrics.length
    ),
    avgPriority: Math.round(
      metrics.reduce((sum, m) => sum + (m.priorityScore || 0), 0) / metrics.length
    ),
    lowestCompetition: Math.min(...metrics.map((m) => m.allInTitleCount)),
    highestPriority: Math.max(...metrics.map((m) => m.priorityScore || 0)),
  };

  // Build tool suggestion context if available
  let suggestionContext = '';
  if (topSuggestions && topSuggestions.length > 0) {
    suggestionContext = topSuggestions
      .map((s) => `- ${s.toolName}: ${s.concept} (ROI: ${s.roiScore}, 開發時間: ${s.estimatedDevTime}h)`)
      .join('\\n');
  }

  const prompt = `你是 SEO 專家和產品經理。用繁體中文分析這些免費工具關鍵字機會：

📈 統計數據：
- 總數: ${stats.total} 個關鍵字
- 平均競爭度: ${stats.avgCompetition}
- 平均優先分: ${stats.avgPriority}
- 最高優先分: ${stats.highestPriority}

📋 Top 10 關鍵字（按優先度排序）：
${keywordList}

${suggestionContext ? `🛠️ Top 3 工具建議：\n${suggestionContext}\n` : ''}

請提供：

## 🎯 今日精華摘要
1. **Top 3 Priorities**：列出最優先開發的3個工具（包含原因、ROI評估、預估開發時間）
2. **總體評估**：2-3句話總結今日機會品質
3. **創新延伸建議**：基於這些關鍵字，提出1-2個延伸工具點子
4. **本週行動計劃**：3個具體可執行的下一步

用繁體中文、emoji、清晰的markdown格式回答。`;

  try {
    const summary = await executeCopilotPrompt(prompt);

    // Verify response is valid
    if (summary && summary.length > 50) {
      console.log('✅ AI summary generated successfully');
      return summary;
    } else {
      throw new Error('AI response too short or empty');
    }
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    console.error('❌ Failed to generate AI summary:', errorObj?.message);
    return generateFallbackSummary(metrics, stats, topSuggestions);
  }
}

/**
 * Generate a fallback summary when AI is unavailable
 */
function generateFallbackSummary(
  metrics: KeywordMetric[],
  stats: { total: number; avgCompetition: number; avgPriority: number; lowestCompetition: number; highestPriority: number },
  topSuggestions?: ToolSuggestion[]
): string {
  const topKeywords = [...metrics]
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
    .slice(0, 5)
    .map((m, i) => {
      const parts = [
        `${i + 1}. **${m.keyword}**`,
        `優先分: ${m.priorityScore || 'N/A'}`,
        `競爭度: ${m.allInTitleCount}`,
        m.estimatedDevTime ? `開發時間: ${m.estimatedDevTime}h` : '',
      ].filter(Boolean);
      return parts.join(' | ');
    })
    .join('\n');

  let suggestionSection = '';
  if (topSuggestions && topSuggestions.length > 0) {
    suggestionSection = `
### 🛠️ Top 3 工具建議
${topSuggestions
  .slice(0, 3)
  .map(
    (s, i) => `${i + 1}. **${s.toolName}**
   - 概念: ${s.concept}
   - 技術棧: ${s.techStack.join(', ')}
   - ROI 分數: ${s.roiScore}
   - 預估開發: ${s.estimatedDevTime} 小時`
  )
  .join('\n')}
`;
  }

  return `## 📊 關鍵字發現摘要

⚠️ AI 總結服務暫時無法使用，以下是基本分析：

### 📈 統計數據
- 總共發現：${stats.total} 個低競爭關鍵字
- 平均競爭度：${stats.avgCompetition}
- 平均優先分：${stats.avgPriority}
- 最高優先分：${stats.highestPriority}
- 最低競爭度：${stats.lowestCompetition}

### 🎯 Top 5 推薦關鍵字（按優先度排序）
${topKeywords}
${suggestionSection}
### 📋 建議行動
1. ✅ 優先針對優先分最高的關鍵字開發工具
2. 📝 研究每個關鍵字的搜尋意圖和用戶需求
3. 🎯 從最簡單的工具開始，快速驗證市場
4. 📊 追蹤每個工具的流量和用戶反饋
5. 🔄 持續優化並基於數據調整優先序

💡 提示：稍後可以重新執行以獲取完整的 AI 分析建議。`;
}
